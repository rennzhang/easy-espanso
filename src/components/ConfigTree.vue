<template>
  <div class="config-tree" tabindex="0" @focus="treeHasFocus = true" @blur="treeHasFocus = false" @click="handleTreeClick">
    <div v-if="loading" class="flex items-center justify-center p-4 text-muted-foreground">
      <div class="animate-spin h-5 w-5 border-2 border-border border-t-primary rounded-full mr-2"></div>
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
            :on-request-rename="handleRequestRename"
          />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, onMounted, watch, onUnmounted, PropType, nextTick } from 'vue';
import { useEspansoStore } from '../store/useEspansoStore';
import TreeNode from './TreeNode.vue';
import type { Match } from '@/types/core/espanso.types';
import type { ConfigTreeNode } from '@/types/core/ui.types';
import Sortable from 'sortablejs';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry';
import { toast } from 'vue-sonner';
import { determineSnippetPosition, focusTriggerInput } from '@/utils/snippetPositionUtils';

// 定义树节点类型
export interface TreeNodeItem {
  id: string;
  type: 'folder' | 'file' | 'match';
  name: string;
  children: TreeNodeItem[];
  match?: Match;
  path?: string;
}

const props = defineProps<{
  selectedId?: string | null;
  searchQuery?: string;
}>();

const emit = defineEmits<{
  (e: 'select', item: Match): void;
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
            type: 'folder', // Represent the package itself as a folder
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



  // Create the current node
  const treeNode: TreeNodeItem = {
    // Generate ID if missing (should not happen with store structure)
    id: node.id || `${node.type}-${node.path || node.name}`,
    type: node.type,
    name: node.name, // Use name directly from store node
    path: node.path,
    children: children,
    match: node.type === 'match' ? node : undefined,
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
  
  // 检查是否有重复的match文件夹节点
  const matchFolderPaths = new Set<string>();
  const uniqueConfigTree = configTree.filter(node => {
    // 如果不是folder类型，或者不是match文件夹，直接保留
    if (node.type !== 'folder' || node.name !== 'match') {
      return true;
    }
    
    // 如果是match文件夹，检查路径是否已经存在
    if (matchFolderPaths.has(node.path)) {
      console.log(`[ConfigTree] 发现重复的match文件夹节点，路径为: ${node.path}，已过滤`);
      return false; // 过滤掉重复的
    }
    
    matchFolderPaths.add(node.path);
    return true;
  });
  
  // 如果match文件夹存在，展平match文件夹的子节点到根级
  // 也就是说，不显示match文件夹本身，而是直接显示其内容
  const shouldFlattenMatchFolder = true; // 这可以根据需要改为配置项
  
  let processedTree;
  if (shouldFlattenMatchFolder) {
    processedTree = [];
    for (const node of uniqueConfigTree) {
      if (node.type === 'folder' && node.name === 'match') {
        // 将match文件夹的子节点直接添加到根级
        if (node.children && node.children.length > 0) {
          // 排序子节点，使时间戳命名的文件和文件夹排序在前面
          const sortedChildren = [...node.children].sort((a, b) => {
            // 检查名称是否以时间戳开头
            const aIsTimestamp = /^\d{13}_/.test(a.name);
            const bIsTimestamp = /^\d{13}_/.test(b.name);
            
            // 如果两个都是时间戳命名，按从新到旧排序
            if (aIsTimestamp && bIsTimestamp) {
              // 提取时间戳部分进行比较
              const aTimestamp = parseInt(a.name.split('_')[0], 10);
              const bTimestamp = parseInt(b.name.split('_')[0], 10);
              return bTimestamp - aTimestamp; // 从大到小排序，最新的在最前面
            }
            
            // 时间戳命名的排在前面
            if (aIsTimestamp) return -1;
            if (bIsTimestamp) return 1;
            
            // 否则按文件名排序
            return a.name.localeCompare(b.name);
          });
          
          processedTree.push(...sortedChildren);
        }
      } else {
        // 其他节点直接添加
        processedTree.push(node);
      }
    }
    console.log('[ConfigTree] 已展平match文件夹内容到根级');
  } else {
    processedTree = uniqueConfigTree;
    
    // 如果不展平match文件夹，也要对match文件夹内的内容进行排序
    for (const node of processedTree) {
      if (node.type === 'folder' && node.children && node.children.length > 0) {
        node.children.sort((a, b) => {
          // 检查名称是否以时间戳开头
          const aIsTimestamp = /^\d{13}_/.test(a.name);
          const bIsTimestamp = /^\d{13}_/.test(b.name);
          
          // 如果两个都是时间戳命名，按从新到旧排序
          if (aIsTimestamp && bIsTimestamp) {
            // 提取时间戳部分进行比较
            const aTimestamp = parseInt(a.name.split('_')[0], 10);
            const bTimestamp = parseInt(b.name.split('_')[0], 10);
            return bTimestamp - aTimestamp; // 从大到小排序，最新的在最前面
          }
          
          // 时间戳命名的排在前面
          if (aIsTimestamp) return -1;
          if (bIsTimestamp) return 1;
          
          // 否则按文件名排序
          return a.name.localeCompare(b.name);
        });
      }
    }
  }
  
  // 转换为TreeNodeItem结构
  const tree = processedTree
    .map((node: any) => convertStoreNodeToTreeNodeItem(node, true))
    .filter((item: TreeNodeItem | null): item is TreeNodeItem => item !== null)
    .filter((node: TreeNodeItem) => !(node.type === 'folder' && node.name === 'config'));

  // 重新排序，将 Packages 文件夹移到最后
  const packagesNode = tree.find((node: TreeNodeItem) => node.type === 'folder' && node.name === 'Packages');
  const otherNodes = tree.filter((node: TreeNodeItem) => !(node.type === 'folder' && node.name === 'Packages'));

  // 排序其他节点，确保时间戳命名的文件和文件夹排序在前面
  otherNodes.sort((a, b) => {
    // 检查名称是否以时间戳开头
    const aIsTimestamp = /^\d{13}_/.test(a.name);
    const bIsTimestamp = /^\d{13}_/.test(b.name);
    
    // 如果两个都是时间戳命名，按从新到旧排序
    if (aIsTimestamp && bIsTimestamp) {
      // 提取时间戳部分进行比较
      const aTimestamp = parseInt(a.name.split('_')[0], 10);
      const bTimestamp = parseInt(b.name.split('_')[0], 10);
      return bTimestamp - aTimestamp; // 从大到小排序，最新的在最前面
    }
    
    // 时间戳命名的排在前面
    if (aIsTimestamp) return -1;
    if (bIsTimestamp) return 1;
    
    // 否则按文件名排序
    return a.name.localeCompare(b.name);
  });
  
  // 如果找到 Packages 节点，将其添加到数组末尾
  const sortedTree = [...otherNodes];
  if (packagesNode) {
    sortedTree.push(packagesNode);
  }

  console.log('[ConfigTree] 转换后的 treeData:', JSON.stringify(sortedTree, null, 2));
  return sortedTree;
});

const handleSelect = (item: TreeNodeItem) => {
  if (item.type === 'match' && item.match) {
    emit('select', item.match);
  } else if (item.type === 'file' || item.type === 'folder') {
    // 使用store.selectItem方法选择文件节点，而不是直接修改state
    store.selectItem(item.id, item.type);
  }
};

// --- NEW: Handler for file/folder node move event from TreeNode ---
const handleNodeMove = (payload: { nodeId: string; targetParentId: string | null; newIndex: number }) => {
  console.log('[ConfigTree] Received moveNode event:', JSON.stringify(payload));
  store.moveItem(payload.nodeId, payload.targetParentId, payload.newIndex);
};

// --- Handler for match move event from TreeNode ---
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

  // 只允许match节点拖拽，禁止文件夹和文件的拖拽
  if (draggedNodeType !== 'match') {
    console.log(`[ConfigTree Root onMove] Denied: Only match nodes can be dragged.`);
    return false;
  }

  // 允许match节点拖入root
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

  // 只处理match类型的拖拽
  if (itemType === 'match') {
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

// 在组件挂载后输出树结构并设置键盘事件监听
onMounted(() => {
  // console.log('ConfigTree组件挂载完成');
  // console.log('当前树结构:', treeData.value);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeyDown);
});

const handleRequestRename = (item: TreeNodeItem) => {
  // Add defensive check for item
  if (!item) {
    console.warn('[ConfigTree] handleRequestRename received undefined item.');
    return;
  }

  // 只处理 file 和 folder 类型的节点 for renaming
  if (item.type !== 'file' && item.type !== 'folder') {
    console.log('[ConfigTree] Ignoring request-rename for non-file/folder node:', item.type);
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

// 获取所有可见且可选择的节点（扁平化树结构）
const getAllSelectableNodes = (): { node: TreeNodeItem, element: HTMLElement }[] => {
  const result: { node: TreeNodeItem, element: HTMLElement }[] = [];

  // 递归函数，用于遍历树结构
  const traverseTree = (nodes: TreeNodeItem[]) => {
    for (const node of nodes) {
      // 获取节点对应的DOM元素
      const nodeElement = document.getElementById(`tree-node-${node.id}`);

      // 只处理可见的节点（DOM元素存在）
      if (nodeElement) {
        // 文件和匹配项是可选择的
        if (node.type === 'file' || node.type === 'match') {
          result.push({ node, element: nodeElement });
        }

        // 检查节点是否展开
        const nodeInfo = TreeNodeRegistry.get(node.id);
        const isNodeOpen = nodeInfo?.info?.isOpen?.value === true;

        // 如果节点有子节点且是展开的，则递归处理子节点
        if (isNodeOpen && node.children && node.children.length > 0) {
          traverseTree(node.children);
        }
      }
    }
  };

  // 从根节点开始遍历
  traverseTree(treeData.value);
  return result;
};

// 处理键盘导航
const handleKeyDown = (event: KeyboardEvent) => {
  // 只有当树组件有焦点时才处理键盘事件
  if (!treeHasFocus.value) {
    // console.log('键盘导航: 树组件没有焦点，忽略键盘事件');
    return;
  }

  // 处理Tab键快速创建新片段
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault(); // 阻止默认的Tab行为
    createNewSnippet();
    return;
  }

  // 处理上下箭头键
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

  // 阻止默认行为（例如页面滚动）
  event.preventDefault();

  console.log(`键盘导航: 检测到 ${event.key} 按键`);

  // 获取所有可选择的节点
  const selectableNodes = getAllSelectableNodes();
  if (selectableNodes.length === 0) {
    console.log('键盘导航: 没有找到可选择的节点');
    return;
  }

  console.log(`键盘导航: 找到 ${selectableNodes.length} 个可选择的节点`);

  // 找到当前选中节点的索引
  const currentIndex = selectableNodes.findIndex(item => item.node.id === props.selectedId);
  console.log(`键盘导航: 当前选中节点索引: ${currentIndex}, ID: ${props.selectedId || '无'}`);

  // 计算下一个要选择的节点索引
  let nextIndex = currentIndex;
  if (event.key === 'ArrowDown') {
    // 向下移动一行
    nextIndex = currentIndex < selectableNodes.length - 1 ? currentIndex + 1 : currentIndex;
  } else if (event.key === 'ArrowUp') {
    // 向上移动一行
    nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
  }

  console.log(`键盘导航: 下一个节点索引: ${nextIndex}`);

  // 如果索引没有变化，则不需要进一步处理
  if (nextIndex === currentIndex && currentIndex !== -1) {
    console.log('键盘导航: 索引未变化，不进行选择');
    return;
  }

  // 如果没有选中项，则选择第一个节点
  if (currentIndex === -1) {
    console.log('键盘导航: 没有当前选中项，选择第一个节点');
    nextIndex = 0;
  }

  // 获取下一个要选择的节点
  const nextNode = selectableNodes[nextIndex].node;
  const nextElement = selectableNodes[nextIndex].element;

  console.log(`键盘导航: 选择节点 ${nextNode.id} (${nextNode.type}: ${nextNode.name})`);

  // 选择节点
  handleSelect(nextNode);

  // 确保选中的节点在视图中可见
  nextElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

// 创建新片段
const createNewSnippet = async () => {
  console.log('创建新片段: 使用Tab键');

  // 使用工具函数确定新片段的位置
  const { targetParentNodeId, insertIndex } = determineSnippetPosition(store.state.configTree, props.selectedId || null);

  if (!targetParentNodeId) {
    console.error('创建新片段: 无法确定目标父节点');
    toast.error('无法确定创建新片段的位置');
    return;
  }

  console.log(`创建新片段: 目标父节点 ${targetParentNodeId}, 插入索引 ${insertIndex}`);

  // 创建新片段数据
  const newMatchData = {
    trigger: ':new',
    replace: '新片段内容',
    label: '新片段',
  };

  try {
    // 调用 store 的 addItem 方法创建新片段
    const addedItem = await store.addItem(newMatchData, 'match', targetParentNodeId, insertIndex);

    if (addedItem) {
      console.log('创建新片段: 成功创建新片段', addedItem.id);
      toast.success('新片段已创建，请编辑触发词');

      // 在下一个 tick 中开始尝试聚焦
      nextTick(() => {
        // 给UI一些时间来渲染
        setTimeout(() => focusTriggerInput(), 100);
      });
    } else {
      console.error('创建新片段: 创建失败');
      toast.error('创建新片段失败');
    }
  } catch (error: any) {
    console.error('创建新片段: 错误', error);
    toast.error(`创建新片段失败: ${error.message || '未知错误'}`);
  }
};

// 默认收起所有节点
const isOpen = ref(false);

</script>

<style scoped>
.config-tree {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden; /* 隐藏横向滚动条 */
  padding: 0;
  margin: 0;
  outline: none; /* 移除默认的焦点轮廓 */
  @apply bg-background; /* Use theme background */
}

/* 树组件获得焦点时的样式 */
.tree-has-focus {
  /* box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.3); */ /* 改用 ring */
  @apply ring-2 ring-ring ring-inset;
}

.tree-container {
  width: 100%;
  margin: 0;
  padding: 0; /* 移除左侧内边距，恢复为0 */
}

/* 拖拽样式 */
.tree-ghost {
  opacity: 0.5;
  /* background-color: #f1f5f9 !important; */
  /* border: 1px dashed #64748b !important; */
  @apply bg-accent/50 border border-dashed border-border !important;
}

.tree-drag {
  opacity: 0.7;
  z-index: 10;
}

/* 确保被拖拽节点的直接子元素（例如图标和名称的容器）不会破坏高度 */
.sortable-drag > div {
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
