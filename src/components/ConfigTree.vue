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
        :searchQuery="searchQuery"
        :parentMatches="false"
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
  children: TreeNodeItem[];
  match?: Match;
  group?: Group;
  path?: string;
}

const props = defineProps<{
  selectedId?: string | null;
  searchQuery?: string;
}>();

const emit = defineEmits<{
  (e: 'select', item: Match | Group): void;
}>();

const store = useEspansoStore();
const loading = computed(() => store.state.loading);

// 创建匹配项节点
const createMatchNode = (match: Match): TreeNodeItem => {
  return {
    id: match.id,
    type: 'match',
    name: match.trigger,
    match: match,
    children: []
  };
};

// 创建分组节点
const createGroupNode = (group: Group): TreeNodeItem => {
  const groupNode: TreeNodeItem = {
    id: group.id,
    type: 'group',
    name: group.name,
    group: group,
    children: []
  };
  // Recursively add nested matches and groups
  if (group.matches) {
    group.matches.forEach(m => groupNode.children.push(createMatchNode(m)));
  }
  if (group.groups) {
    group.groups.forEach(g => groupNode.children.push(createGroupNode(g)));
  }
  return groupNode;
};

// 递归转换 store 的 configTree 结构为 TreeNodeItem 结构
const convertStoreNodeToTreeNodeItem = (node: any, isTopLevel: boolean = false): TreeNodeItem | null => {
  if (!node) return null;

  // --- Special Handling for top-level 'packages' folder ---
  if (isTopLevel && node.type === 'folder' && node.name === 'packages') {
    const packagesNode: TreeNodeItem = {
      id: node.id || `folder-${node.path || 'packages'}`,
      type: 'folder',
      name: 'Packages', // Rename to 'Packages'
      path: node.path,
      children: []
    };

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((packageSubDir: any) => {
        // Expecting only folders directly under 'packages'
        if (packageSubDir.type === 'folder') {
          const packageNode: TreeNodeItem = {
            id: packageSubDir.id || `folder-${packageSubDir.path}`,
            type: 'folder', // Represent the package itself as a folder/group
            name: packageSubDir.name,
            path: packageSubDir.path,
            children: []
          };

          // Find package.yml within the sub-directory
          const packageYml = packageSubDir.children?.find((f: any) => f.type === 'file' && f.name === 'package.yml');

          if (packageYml) {
            // Add matches from package.yml directly to the package node
            if (packageYml.matches && Array.isArray(packageYml.matches)) {
               packageNode.children.push(...packageYml.matches.map(createMatchNode));
            }
            // Add groups from package.yml directly to the package node
            if (packageYml.groups && Array.isArray(packageYml.groups)) {
               packageNode.children.push(...packageYml.groups.map((g: Group) => createGroupNode(g)));
            }
          }

          // Only add the package node if it has children (matches/groups from package.yml)
          if (packageNode.children.length > 0) {
             packagesNode.children.push(packageNode);
          }
        }
         // Ignore other files/folders directly under 'packages' if any
      });
    }

     // Only return the 'Packages' node if it has any valid package sub-nodes
     return packagesNode.children.length > 0 ? packagesNode : null;
  }
  // --- End Special Handling ---

   // --- Standard Node Processing ---
  // Skip processing other nodes inside 'packages' that weren't handled above
  // This prevents showing the raw structure like package.yml if special handling missed it.
  // Note: This assumes paths are correctly set during store build.
  if (node.path && node.path.startsWith('packages/') && node.name !== 'packages') {
      return null;
  }


  let children: TreeNodeItem[] = [];

  // Recursively convert children first (folders/files)
  if (node.children && Array.isArray(node.children)) {
    children = node.children
      .map((child: any) => convertStoreNodeToTreeNodeItem(child))
      .filter((item: TreeNodeItem | null): item is TreeNodeItem => item !== null);
  }

  // Add matches defined directly under this node (typically a file)
  if (node.matches && Array.isArray(node.matches)) {
    children = [...children, ...node.matches.map(createMatchNode)];
  }

  // Add groups defined directly under this node (typically a file)
  if (node.groups && Array.isArray(node.groups)) {
    children = [...children, ...node.groups.map((group: Group) => createGroupNode(group))];
  }

  // Create the current node
  const treeNode: TreeNodeItem = {
    // Generate ID if missing (should not happen with store structure)
    id: node.id || `${node.type}-${node.path || node.name}`,
    type: node.type,
    name: node.name, // Use name directly from store node
    path: node.path,
    children: children,
    match: node.type === 'match' ? node : undefined,
    group: node.type === 'group' ? node : undefined
  };

  // Filter out file nodes that have no children *unless* it's specifically selected
  // (This helps hide empty file groups, like `_base.yml`)
  // if (treeNode.type === 'file' && treeNode.children.length === 0 && treeNode.id !== props.selectedId) {
  //   return null;
  // }

  return treeNode;
};

// 构建树结构 - SIMPLIFIED
const treeData = computed(() => {
  const configTree = store.state.configTree || [];
  const tree = configTree
    // Pass true for isTopLevel for the root nodes
    .map((node: any) => convertStoreNodeToTreeNodeItem(node, true))
    .filter((item: TreeNodeItem | null): item is TreeNodeItem => item !== null) // Filter out null results
    // Filter top-level 'config' folder (moved here to happen *after* conversion)
    .filter(node => !(node.type === 'folder' && node.name === 'config'));
  return tree;
});

const handleSelect = (item: TreeNodeItem) => {
  // Emit the original Match or Group object if available
  if (item.type === 'match' && item.match) {
    emit('select', item.match);
  } else if (item.type === 'group' && item.group) {
    emit('select', item.group);
  }
  // Optionally handle selection of file/folder nodes if needed
  // else if (item.type === 'file' || item.type === 'folder') {
  //   console.log('Selected folder/file:', item);
  // }
};

// 监听选中ID的变化
watch(() => props.selectedId, (newId) => {
  if (newId) {
    // 可以在这里实现自动展开到选中项的逻辑
  }
});

// 在组件挂载后输出树结构
onMounted(() => {
  // console.log('ConfigTree组件挂载完成');
  // console.log('当前树结构:', treeData.value);
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
  padding: 0.75rem;
  margin: 0;
  width: 100%;
}
</style>
