<template>
  <div class="config-tree">
    <div v-if="loading" class="flex items-center justify-center p-4">
      <div class="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
      <span>加载中...</span>
    </div>
    <div v-else-if="!treeData || treeData.length === 0" class="p-4 text-muted-foreground">
      没有找到配置文件
    </div>
    <div v-else class="tree-container px-0 mx-0">
      <TreeNode
        v-for="node in treeData"
        :key="node.id"
        :node="node"
        :selected-id="selectedId"
        @select="handleSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, onMounted, watch } from 'vue';
import { useEspansoStore } from '../store/useEspansoStore';
import TreeNode from './TreeNode.vue';
import type { Match, Group } from '../types/espanso';

// 定义树节点类型
export interface TreeNodeItem {
  id: string;
  type: 'folder' | 'file' | 'match' | 'group';
  name: string;
  children?: TreeNodeItem[];
  match?: Match;
  group?: Group;
  path?: string;
}

const props = defineProps<{
  selectedId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'select', item: Match | Group): void;
}>();

const store = useEspansoStore();
const loading = computed(() => store.state.loading);

// 构建树结构
const treeData = computed(() => {
  const tree: TreeNodeItem[] = [];

  // 获取所有匹配项和分组
  const allMatches = store.getAllMatchesFromTree ? store.getAllMatchesFromTree() : [];
  const allGroups = store.getAllGroupsFromTree ? store.getAllGroupsFromTree() : [];

  console.log('所有匹配项数量:', allMatches.length);
  console.log('所有分组数量:', allGroups.length);

  // 创建一个映射，用于跟踪文件路径到分组节点的映射
  const filePathToGroupMap = new Map<string, TreeNodeItem>();

  // 创建一个映射，用于跟踪已添加的匹配项和分组
  const addedMatches = new Set<string>();
  const addedGroups = new Set<string>();

  // 处理配置树
  const processConfigTree = () => {
    const configTree = store.state.configTree;
    console.log('配置树数据:', configTree);

    // 如果配置树为空或者没有子节点，直接使用所有匹配项和分组构建树
    if (!configTree || configTree.length === 0) {
      buildFlatTree();
      return;
    }

    // 首先处理所有文件夹和文件，创建分组结构
    for (const node of configTree) {
      if (node.type === 'folder') {
        // 检查是否是 packages 文件夹
        const isPackagesFolder = node.name === 'packages';

        if (isPackagesFolder) {
          // 创建 packages 分组节点
          const packagesNode: TreeNodeItem = {
            id: `folder-${node.path}`,
            type: 'folder',
            name: 'Packages',
            children: []
          };

          // 处理 packages 下的子目录
          if (node.children && node.children.length > 0) {
            for (const child of node.children) {
              if (child.type === 'folder') {
                // 每个子目录作为一个分组
                const packageGroupNode: TreeNodeItem = {
                  id: `folder-${child.path}`,
                  type: 'folder',
                  name: child.name,
                  children: []
                };

                // 处理包目录下的文件
                if (child.children && child.children.length > 0) {
                  for (const file of child.children) {
                    if (file.type === 'file' && file.name === 'package.yml') {
                      // 将 package.yml 中的匹配项添加到包分组中
                      processPackageFile(file, packageGroupNode.children, addedMatches, addedGroups);
                    }
                  }
                }

                // 只添加有子节点的包分组
                if (packageGroupNode.children.length > 0) {
                  packagesNode.children.push(packageGroupNode);

                  // 添加到映射中
                  filePathToGroupMap.set(child.path, packageGroupNode);
                }
              }
            }
          }

          // 只添加有子节点的 packages 分组
          if (packagesNode.children.length > 0) {
            tree.push(packagesNode);
          }
        } else {
          // 处理其他文件夹
          processFolder(node, tree, addedMatches, addedGroups, filePathToGroupMap);
        }
      } else if (node.type === 'file') {
        // 处理文件，创建以文件名（不含后缀）为名称的分组
        processFile(node, tree, addedMatches, addedGroups, filePathToGroupMap);
      }
    }

    // 处理未添加的匹配项和分组
    processUnaddedItems(allMatches, allGroups, addedMatches, addedGroups, tree);
  };

  // 处理文件夹
  const processFolder = (
    folder: any,
    parentChildren: TreeNodeItem[],
    addedMatches: Set<string>,
    addedGroups: Set<string>,
    filePathToGroupMap: Map<string, TreeNodeItem>
  ) => {
    // 创建文件夹节点
    const folderNode: TreeNodeItem = {
      id: `folder-${folder.path}`,
      type: 'folder',
      name: folder.name,
      children: []
    };

    // 处理子节点
    if (folder.children && folder.children.length > 0) {
      for (const child of folder.children) {
        if (child.type === 'folder') {
          processFolder(child, folderNode.children, addedMatches, addedGroups, filePathToGroupMap);
        } else if (child.type === 'file') {
          processFile(child, folderNode.children, addedMatches, addedGroups, filePathToGroupMap);
        }
      }
    }

    // 只添加有子节点的文件夹
    if (folderNode.children.length > 0) {
      parentChildren.push(folderNode);

      // 添加到映射中
      filePathToGroupMap.set(folder.path, folderNode);
    }
  };

  // 处理文件
  const processFile = (
    file: any,
    parentChildren: TreeNodeItem[],
    addedMatches: Set<string>,
    addedGroups: Set<string>,
    filePathToGroupMap: Map<string, TreeNodeItem>
  ) => {
    // 跳过以下划线开头的文件
    if (file.name.startsWith('_')) {
      return;
    }

    // 获取文件名（不含后缀）作为分组名
    const groupName = file.name.replace(/\.(yml|yaml)$/, '');

    // 创建分组节点
    const groupNode: TreeNodeItem = {
      id: `file-${file.path}`,
      type: 'file',
      name: groupName,
      path: file.path,
      children: []
    };

    // 处理文件中的匹配项
    if (file.matches && file.matches.length > 0) {
      for (const match of file.matches) {
        groupNode.children.push({
          id: match.id,
          type: 'match',
          name: match.trigger,
          match: match
        });

        // 标记匹配项已添加
        addedMatches.add(match.id);
      }
    }

    // 处理文件中的分组
    if (file.groups && file.groups.length > 0) {
      for (const group of file.groups) {
        const nestedGroupNode = createGroupNode(group);
        groupNode.children.push(nestedGroupNode);

        // 标记分组已添加
        markGroupAsAdded(group, addedGroups);
      }
    }

    // 只添加有子节点的分组
    if (groupNode.children.length > 0) {
      parentChildren.push(groupNode);

      // 添加到映射中
      filePathToGroupMap.set(file.path, groupNode);
    }
  };

  // 处理 package.yml 文件
  const processPackageFile = (
    file: any,
    parentChildren: TreeNodeItem[],
    addedMatches: Set<string>,
    addedGroups: Set<string>
  ) => {
    // 处理文件中的匹配项
    if (file.matches && file.matches.length > 0) {
      for (const match of file.matches) {
        parentChildren.push({
          id: match.id,
          type: 'match',
          name: match.trigger,
          match: match
        });

        // 标记匹配项已添加
        addedMatches.add(match.id);
      }
    }

    // 处理文件中的分组
    if (file.groups && file.groups.length > 0) {
      for (const group of file.groups) {
        const groupNode = createGroupNode(group);
        parentChildren.push(groupNode);

        // 标记分组已添加
        markGroupAsAdded(group, addedGroups);
      }
    }
  };

  // 标记分组及其子分组为已添加
  const markGroupAsAdded = (group: Group, addedGroups: Set<string>) => {
    addedGroups.add(group.id);

    // 递归标记嵌套分组
    if (group.groups && group.groups.length > 0) {
      for (const nestedGroup of group.groups) {
        markGroupAsAdded(nestedGroup, addedGroups);
      }
    }
  };

  // 处理未添加的匹配项和分组
  const processUnaddedItems = (
    allMatches: Match[],
    allGroups: Group[],
    addedMatches: Set<string>,
    addedGroups: Set<string>,
    tree: TreeNodeItem[]
  ) => {
    // 检查是否有未添加的匹配项和分组
    const unaddedMatches = allMatches.filter(m => !addedMatches.has(m.id));
    const unaddedGroups = allGroups.filter(g => !addedGroups.has(g.id));

    if (unaddedMatches.length > 0 || unaddedGroups.length > 0) {
      // 创建一个"未分类"节点
      const uncategorizedNode: TreeNodeItem = {
        id: 'uncategorized',
        type: 'folder',
        name: '未分类片段',
        children: []
      };

      // 添加未添加的匹配项
      for (const match of unaddedMatches) {
        uncategorizedNode.children.push({
          id: match.id,
          type: 'match',
          name: match.trigger,
          match: match
        });
      }

      // 添加未添加的分组
      for (const group of unaddedGroups) {
        const groupNode = createGroupNode(group);
        uncategorizedNode.children.push(groupNode);
      }

      // 只添加有子节点的"未分类"节点
      if (uncategorizedNode.children.length > 0) {
        tree.push(uncategorizedNode);
      }
    }
  };

  // 创建扁平的树结构
  const buildFlatTree = () => {
    // 创建一个映射，用于按文件路径分组匹配项
    const filePathMap = new Map<string, { name: string, matches: Match[], groups: Group[] }>();

    // 遍历所有匹配项，按文件路径分组
    for (const match of allMatches) {
      // 尝试从匹配项中获取文件路径
      const filePath = match.filePath || '';

      if (filePath) {
        // 提取文件名作为分组名
        const fileName = filePath.split('/').pop() || '';
        const groupName = fileName.replace(/\.(yml|yaml)$/, '');

        if (!filePathMap.has(filePath)) {
          filePathMap.set(filePath, { name: groupName, matches: [], groups: [] });
        }

        filePathMap.get(filePath)?.matches.push(match);
      } else {
        // 如果没有文件路径，添加到"未分类"
        if (!filePathMap.has('uncategorized')) {
          filePathMap.set('uncategorized', { name: '未分类片段', matches: [], groups: [] });
        }

        filePathMap.get('uncategorized')?.matches.push(match);
      }
    }

    // 遍历所有分组，按文件路径分组
    for (const group of allGroups) {
      // 尝试从分组中获取文件路径
      const filePath = group.filePath || '';

      if (filePath) {
        // 提取文件名作为分组名
        const fileName = filePath.split('/').pop() || '';
        const groupName = fileName.replace(/\.(yml|yaml)$/, '');

        if (!filePathMap.has(filePath)) {
          filePathMap.set(filePath, { name: groupName, matches: [], groups: [] });
        }

        filePathMap.get(filePath)?.groups.push(group);
      } else {
        // 如果没有文件路径，添加到"未分类"
        if (!filePathMap.has('uncategorized')) {
          filePathMap.set('uncategorized', { name: '未分类片段', matches: [], groups: [] });
        }

        filePathMap.get('uncategorized')?.groups.push(group);
      }
    }

    // 创建树节点
    for (const [filePath, data] of filePathMap.entries()) {
      const groupNode: TreeNodeItem = {
        id: `file-${filePath}`,
        type: 'file',
        name: data.name,
        path: filePath,
        children: []
      };

      // 添加匹配项
      for (const match of data.matches) {
        groupNode.children.push({
          id: match.id,
          type: 'match',
          name: match.trigger,
          match: match
        });
      }

      // 添加分组
      for (const group of data.groups) {
        const nestedGroupNode = createGroupNode(group);
        groupNode.children.push(nestedGroupNode);
      }

      // 只添加有子节点的分组
      if (groupNode.children.length > 0) {
        tree.push(groupNode);
      }
    }
  };

  // 创建分组节点
  const createGroupNode = (group: Group): TreeNodeItem => {
    const groupNode: TreeNodeItem = {
      id: group.id,
      type: 'group',
      name: group.name,
      group: group,
      path: group.filePath || '', // 添加 path 属性，用于判断是否为一级节点
      children: []
    };

    // 处理分组中的匹配项
    if (group.matches && group.matches.length > 0) {
      for (const match of group.matches) {
        groupNode.children.push({
          id: match.id,
          type: 'match',
          name: match.trigger,
          match: match
        });
      }
    }

    // 处理嵌套分组
    if (group.groups && group.groups.length > 0) {
      processGroups(group.groups, groupNode.children);
    }

    return groupNode;
  };

  // 处理配置节点
  const processConfigNode = (node: any, parentChildren: TreeNodeItem[], addedMatches?: Set<string>, addedGroups?: Set<string>) => {
    if (node.type === 'file') {
      // 创建文件节点
      const fileNode: TreeNodeItem = {
        id: `file-${node.path}`,
        type: 'file',
        name: node.name,
        path: node.path,
        children: []
      };

      // 处理匹配项
      if (node.matches && node.matches.length > 0) {
        for (const match of node.matches) {
          fileNode.children.push({
            id: match.id,
            type: 'match',
            name: match.trigger,
            match: match
          });

          // 标记匹配项已添加
          if (addedMatches) {
            addedMatches.add(match.id);
          }
        }
      }

      // 处理分组
      if (node.groups && node.groups.length > 0) {
        for (const group of node.groups) {
          const groupNode = createGroupNode(group);
          fileNode.children.push(groupNode);

          // 标记分组已添加
          if (addedGroups) {
            addedGroups.add(group.id);

            // 递归标记嵌套分组
            const markNestedGroups = (g: Group) => {
              if (g.groups && g.groups.length > 0) {
                for (const nestedGroup of g.groups) {
                  if (addedGroups) {
                    addedGroups.add(nestedGroup.id);
                  }
                  markNestedGroups(nestedGroup);
                }
              }
            };

            markNestedGroups(group);
          }
        }
      }

      // 只添加有子节点的文件
      if (fileNode.children.length > 0) {
        parentChildren.push(fileNode);
      }
    }
  };

  // 处理分组
  const processGroups = (groups: Group[], parentChildren: TreeNodeItem[]) => {
    for (const group of groups) {
      const groupNode: TreeNodeItem = {
        id: group.id,
        type: 'group',
        name: group.name,
        group: group,
        children: []
      };

      // 处理分组中的匹配项
      if (group.matches && group.matches.length > 0) {
        for (const match of group.matches) {
          groupNode.children.push({
            id: match.id,
            type: 'match',
            name: match.trigger,
            match: match
          });
        }
      }

      // 处理嵌套分组
      if (group.groups && group.groups.length > 0) {
        processGroups(group.groups, groupNode.children);
      }

      parentChildren.push(groupNode);
    }
  };

  // 调用处理函数
  processConfigTree();

  // 如果树为空，尝试使用扁平结构
  if (tree.length === 0 && (allMatches.length > 0 || allGroups.length > 0)) {
    buildFlatTree();
  }

  console.log('生成的树结构:', tree);
  return tree;
});

const handleSelect = (item: TreeNodeItem) => {
  if (item.type === 'match' && item.match) {
    emit('select', item.match);
  } else if (item.type === 'group' && item.group) {
    emit('select', item.group);
  }
};

// 监听选中ID的变化
watch(() => props.selectedId, (newId) => {
  if (newId) {
    console.log('选中ID变化:', newId);
    // 可以在这里实现自动展开到选中项的逻辑
  }
});

// 在组件挂载后输出树结构
onMounted(() => {
  console.log('ConfigTree组件挂载完成');
  console.log('当前树结构:', treeData.value);
});
</script>

<style scoped>
.config-tree {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 0;
  margin: 0;
}

.tree-container {
  padding: 0;
  margin: 0;
  width: 100%;
}
</style>
