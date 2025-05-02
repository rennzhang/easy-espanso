<template>
  <div class="config-tree">
    <div v-if="loading" class="flex items-center justify-center p-4">
      <div class="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
      <span>加载中...</span>
    </div>
    <div v-else-if="!treeData || treeData.length === 0" class="p-4 text-muted-foreground">
      没有找到配置文件
    </div>
    <div v-else class="tree-container px-0 mx-0 drop-zone" v-sortable="sortableOptions" data-parent-id="root">
      <template v-for="node in treeData" :key="node.id">
         <TreeNode
            :node="node"
            :selected-id="selectedId"
            :searchQuery="searchQuery"
            :parentMatches="false"
            :draggable="true"
            @select="handleSelect"
            @move="handleMove"
          />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, onMounted, watch } from 'vue';
import { useEspansoStore } from '../store/useEspansoStore';
import TreeNode from './TreeNode.vue';
import type { Match, Group } from '../types/espanso';
import { GripVerticalIcon } from 'lucide-vue-next';
import Sortable from 'sortablejs';

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
  // Determine the display name based on trigger or triggers
  let displayName = match.trigger || ''; // Default to trigger
  if (!displayName && Array.isArray(match.triggers) && match.triggers.length > 0) {
    displayName = match.triggers[0]; // Use first trigger if trigger is missing
    if (match.triggers.length > 1) {
      displayName += '...'; // Indicate multiple triggers
    }
  } else if (!displayName) {
    displayName = '[未命名触发词]'; // Fallback if neither exists
  }

  return {
    id: match.id,
    type: 'match',
    name: displayName, // Use the determined display name
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

// 构建树结构 - 恢复原始的 treeData 计算属性
const treeData = computed(() => {
  const configTree = store.state.configTree || [];
  console.log('[ConfigTree] 原始 store.state.configTree:', JSON.stringify(configTree, null, 2));
  const tree = configTree
    // Pass true for isTopLevel for the root nodes
    .map((node: any) => convertStoreNodeToTreeNodeItem(node, true))
    .filter((item: TreeNodeItem | null): item is TreeNodeItem => item !== null) // Filter out null results
    // Filter top-level 'config' folder (moved here to happen *after* conversion)
    .filter(node => !(node.type === 'folder' && node.name === 'config'));
  console.log('[ConfigTree] 转换后的 treeData:', JSON.stringify(tree, null, 2));
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

// 处理 SortableJS 拖拽更新事件 (顶层或从子层拖入)
const handleSortUpdate = (event: Sortable.SortableEvent) => {
  console.log('[ConfigTree Root SortableJS onUpdate]', event);
  const { item, from, to, oldIndex, newIndex } = event;

  if (oldIndex === undefined || newIndex === undefined) return;

  const itemId = item.dataset.id;
  if (!itemId) return;

  // 来自哪个父级 (SortableJS 会给元素添加 data-parent-id)
  const oldParentId = from.dataset.parentId || null;
  // 去往哪个父级 (根目录为 null)
  const newParentId = to.dataset.parentId || null;

  console.log(`Moving item ${itemId} from parent ${oldParentId} (index ${oldIndex}) to parent ${newParentId} (index ${newIndex})`);

  // 调用 store action 处理移动
  store.moveTreeItem(itemId, oldParentId, newParentId, oldIndex, newIndex);
};

// 处理从子节点冒泡上来的 move 事件
const handleMove = (payload: { itemId: string; oldParentId: string | null; newParentId: string | null; oldIndex: number; newIndex: number }) => {
  console.log('[ConfigTree handleMove from TreeNode]', payload);
  // 调用 store action 处理移动 (这里的 newParentId 可能需要进一步判断)
  store.moveTreeItem(payload.itemId, payload.oldParentId, payload.newParentId, payload.oldIndex, payload.newIndex);
};

// SortableJS 选项
const sortableOptions = computed(() => ({
  animation: 150,
  ghostClass: 'sortable-ghost',
  dragClass: 'sortable-drag',
  group: 'nested-tree',
  fallbackOnBody: true,       // 允许拖拽到整个body区域
  swapThreshold: 0.65,        // 交换阈值
  handle: '.cursor-grab',     // 只允许通过.cursor-grab元素拖拽
  emptyInsertThreshold: 10,   // 插入空列表的距离阈值
  onStart: (evt: Sortable.SortableEvent) => {
    console.log('[ConfigTree SortableJS onStart]', evt);
    // 添加样式，标识拖拽中状态
    document.body.classList.add('dragging-active');

    // 获取被拖拽元素的相关信息
    const draggedItemId = evt.item.dataset.id;
    const draggedItemType = evt.item.dataset.nodeType;

    // 如果拖拽的是文件夹或分组，自动折叠它
    if (draggedItemType === 'folder' || draggedItemType === 'group' || draggedItemType === 'file') {
      // 找到拖拽元素的TreeNode组件实例
      const treeNodeEl = evt.item;
      if (treeNodeEl) {
        // 查找折叠图标并触发点击
        const chevronIcon = treeNodeEl.querySelector('.ChevronDownIcon');
        if (chevronIcon) {
          // 模拟点击折叠图标
          chevronIcon.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
        }

        // 直接隐藏子容器作为备用方案
        const childrenContainer = treeNodeEl.querySelector('.children');
        if (childrenContainer) {
          (childrenContainer as HTMLElement).style.display = 'none';
        }
      }

      // 强制隐藏克隆元素的子容器
      setTimeout(() => {
        const draggedClone = document.querySelector('.sortable-fallback');
        if (draggedClone) {
          const cloneChildren = draggedClone.querySelector('.children');
          if (cloneChildren) {
            (cloneChildren as HTMLElement).style.display = 'none';
          }
        }
      }, 0);
    }
  },
  onEnd: (evt: Sortable.SortableEvent) => {
    console.log('[ConfigTree SortableJS onEnd]', evt);
    // 移除拖拽样式
    document.body.classList.remove('dragging-active');

    // 检查是否在安全区域内结束拖拽
    const targetContainer = evt.to;
    const isInSafeZone = targetContainer.classList.contains('drop-zone') ||
                         !!targetContainer.closest('.drop-zone');

    // 如果不在安全区域内，不触发更新事件，元素会自动返回原位置
    if (!isInSafeZone) {
      console.log('[ConfigTree SortableJS onEnd] 拖拽取消：不在安全区域内');
      return;
    }
  },
  onUpdate: handleSortUpdate,
}));
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

/* 拖拽样式 */
.tree-ghost {
  opacity: 0.5;
  background-color: #f1f5f9 !important;
  border: 1px dashed #64748b !important;
}

.tree-drag {
  /* 可以保留基本的拖拽样式，例如透明度 */
  opacity: 0.7;
  z-index: 10;
  /* 移除强制高度和溢出隐藏 */
  /* height: 28px !important; */
  /* overflow: hidden !important; */
  /* 移除背景色 */
  /* background-color: rgba(230, 230, 230, 0.8) !important; */
}

/* 确保被拖拽节点的直接子元素（例如图标和名称的容器）不会破坏高度 */
.sortable-drag > div {
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
