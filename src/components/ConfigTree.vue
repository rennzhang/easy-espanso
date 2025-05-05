<template>
  <div class="config-tree" tabindex="0" @focus="treeHasFocus = true" @blur="treeHasFocus = false" @click="handleTreeClick">
    <div v-if="loading" class="flex items-center justify-center p-4">
      <div class="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
      <span>加载中...</span>
    </div>
    <div v-else-if="!treeData || treeData.length === 0" class="p-4 text-muted-foreground">
      没有找到配置文件
    </div>
    <div v-else class="tree-container w-full drop-zone" v-sortable="rootSortableOptions" data-parent-id="root" data-container-type="root">
      <template v-for="node in treeData" :key="node.id">
         <TreeNode
            :node="node"
            :selected-id="selectedId"
            :searchQuery="searchQuery"
            :parentMatches="false"
            :draggable="true"
            :level="0"
            @select="handleSelect"
            @move="handleItemMove"
            @moveNode="handleNodeMove"
            @request-rename="handleRequestRename"
          />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, onMounted, watch, onUnmounted, PropType } from 'vue';
import { useEspansoStore } from '../store/useEspansoStore';
import TreeNode from './TreeNode.vue';
import { ConfigTreeNode } from '@/types/core/ui.types';
import type { Match, Group } from '@/types/core/espanso.types';
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
  (e: 'request-rename', item: TreeNodeItem): void;
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
    name: group.name || '',
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
  
  // 重新排序，将 Packages 文件夹移到最后
  const packagesNode = tree.find(node => node.type === 'folder' && node.name === 'Packages');
  const otherNodes = tree.filter(node => !(node.type === 'folder' && node.name === 'Packages'));
  
  // 如果找到 Packages 节点，将其添加到数组末尾
  const sortedTree = [...otherNodes];
  if (packagesNode) {
    sortedTree.push(packagesNode);
  }
  
  console.log('[ConfigTree] 转换后的 treeData:', JSON.stringify(sortedTree, null, 2));
  return sortedTree;
});

const handleSelect = (item: TreeNodeItem) => {
  // 处理所有类型的节点选择
  if (item.type === 'match' && item.match) {
    // 发出匹配项的原始对象
    emit('select', item.match);
  } else if (item.type === 'group' && item.group) {
    // 发出分组的原始对象
    emit('select', item.group);
  } else if (item.type === 'file') {
    // 对于文件，我们设置selectedItemId
    store.state.selectedItemId = item.id;
    store.state.selectedItemType = null; // 不是match或group
    // 注意：这里不需要emit select事件，因为对文件我们只更新视觉效果
  }
  // 对于文件夹类型，不做任何处理
};

// --- NEW: Handler for file/folder node move event from TreeNode ---
const handleNodeMove = (payload: { nodeId: string; targetParentId: string | null; newIndex: number }) => {
  console.log('[ConfigTree] Received moveNode event:', JSON.stringify(payload));
  store.moveItem(payload.nodeId, payload.targetParentId, payload.newIndex);
};

// --- Handler for match/group move event from TreeNode ---
const handleItemMove = (payload: { itemId: string; oldParentId: string | null; newParentId: string | null; oldIndex: number; newIndex: number }) => {
  console.log('[ConfigTree] Received move event (for item):', JSON.stringify(payload));
  store.moveItem(payload.itemId, payload.newParentId, payload.newIndex);
};

// SortableJS Options for the ROOT container
const rootSortableOptions = computed(() => ({
  group: 'configTreeGroup',
  animation: 150,
  fallbackOnBody: true,
  swapThreshold: 0.65,
  handle: '.cursor-grab',
  onMove: handleRootDragMove, // Use a specific move handler for root
  onEnd: handleRootSortEnd,   // Use a specific end handler for root
  filter: '.ignore-drag',
  preventOnFilter: true,
}));

// SortableJS onMove validation for ROOT container
const handleRootDragMove = (event: Sortable.MoveEvent): boolean => {
  const draggedElement = event.dragged; // TreeNode div
  const draggedNodeType = draggedElement.dataset.nodeType as TreeNodeItem['type'] | undefined;

  console.log(`[ConfigTree Root onMove] Dragged: ${draggedNodeType} (${draggedElement.dataset.id}) into Root`);

  // 只允许match和group节点拖拽，禁止文件夹和文件的拖拽
  if (draggedNodeType !== 'match' && draggedNodeType !== 'group') {
    console.log(`[ConfigTree Root onMove] Denied: Only match and group nodes can be dragged.`);
    return false;
  }

  // 允许match和group节点拖入root
  console.log('[ConfigTree Root onMove] Allowed move.');
  return true;
};

// SortableJS onEnd handler for ROOT container
const handleRootSortEnd = (event: Sortable.SortableEvent) => {
  const { item, from, to, oldIndex, newIndex } = event;

  // Only handle drops *into* the root container from somewhere else
  // Drops starting and ending in root (reordering) are handled here too.
  if (to !== event.target) { // event.target should be the root container div
      console.log('[ConfigTree Root onEnd] Ignoring drop originating outside root.');
      return;
  }

  if (oldIndex === undefined || newIndex === undefined) return;

  const itemId = item.dataset.id; // ID of the dragged item
  const itemType = item.dataset.nodeType as TreeNodeItem['type'] | undefined;
  const oldParentId = from.dataset.parentId === 'root' || from.dataset.parentId === undefined ? null : from.dataset.parentId; // Parent ID of the source container

  console.log(`[ConfigTree Root onEnd] Item ID: ${itemId}, Type: ${itemType}, Old Parent: ${oldParentId}, New Index: ${newIndex}`);

  if (!itemId || !itemType) {
    console.error('[ConfigTree Root onEnd] Missing item ID or type.');
    return;
  }

  // Check if it really moved
  if (from === to && oldIndex === newIndex) {
     console.log('[ConfigTree Root onEnd] No actual move detected.');
     return;
  }

  // 只处理match和group类型的拖拽
  if (itemType === 'match' || itemType === 'group') {
    // 触发moveItem操作，将targetParentId设为null（根目录）
  store.moveItem(itemId, oldParentId, newIndex);

  } else {
    console.warn(`[ConfigTree Root onEnd] Unexpected item type dropped at root: ${itemType}`);
  }
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
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});

const handleRequestRename = (item: TreeNodeItem) => {
  // Add defensive check for item
  if (!item) {
    console.warn('[ConfigTree] handleRequestRename received undefined item.');
    return;
  }

  // 只处理 group 类型的节点 for renaming
  if (item.type !== 'group') {
    console.log('[ConfigTree] Ignoring request-rename for non-group node:', item.type);
    return;
  }

  console.log('[ConfigTree] Received request-rename event from TreeNode:', item.id, item.type);

  // Re-emit the event upwards
  emit('request-rename', item); 
  console.log('[ConfigTree] Emitted request-rename upwards with item:', item);
};

const treeHasFocus = ref(false);

// 树组件点击处理函数
const handleTreeClick = (event: MouseEvent) => {
  const treeElement = event.currentTarget as HTMLElement;
  if (treeElement) {
    // 确保树组件获得焦点
    treeElement.focus();
    treeHasFocus.value = true;
    console.log('树组件获得焦点');
  }
};

// 暴露树组件聚焦状态，供其他组件使用
defineExpose({
  treeHasFocus
});

// 监听文档点击事件，检测点击是否在树外部
const handleDocumentClick = (event: MouseEvent) => {
  const treeElement = document.querySelector('.config-tree');
  if (treeElement && !treeElement.contains(event.target as Node)) {
    treeHasFocus.value = false;
    console.log('树组件失去焦点 (外部点击)');
  }
};

</script>

<style scoped>
.config-tree {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden; /* 隐藏横向滚动条 */
  padding: 0;
  margin: 0;
}

.tree-container {
  width: 100%;
  margin: 0;
  padding: 0; /* 移除左侧内边距，恢复为0 */
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
