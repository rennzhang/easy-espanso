<template>
  <div class="tree-node px-0 pl-0" v-if="isVisible" :id="`tree-node-${node.id}`" :data-id="node.id" :data-node-type="node.type" :data-node-name="node.name">
    <!-- 非叶子节点（文件夹、文件、分组） -->
    <div
      v-if="node.type !== 'match'"
      :class="node.type + '-node'"
      @click="toggleFolder($event)"
    >
      <div
        class="flex items-center w-full px-0 py-1 rounded group"
        :class="{
          'bg-[linear-gradient(135deg,#2b5876,#4e4376)] text-primary-foreground': isSelected,
          'hover:bg-accent hover:text-accent-foreground': !isSelected,
        }"
      >
        <span class="mr-1 text-muted-foreground" v-if="hasChildren">
          <ChevronRightIcon v-if="!isOpen" class="h-4 w-4" />
          <ChevronDownIcon v-else class="h-4 w-4" />
        </span>
        <span class="mr-1 text-muted-foreground" v-else>
          <span class="w-4 inline-block"></span>
        </span>
        <span class="text-sm font-medium flex-grow">
          <HighlightText
            v-if="searchQuery"
            :text="displayName"
            :searchQuery="selfMatchesSearch ? searchQuery : ''"
          />
          <template v-else>{{ displayName }}</template>
        </span>
        <span
          v-if="visibleChildCount > 0"
          class="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full"
        >
          {{ visibleChildCount }}
        </span>
        <!-- 文件夹图标 (新添加) -->
        <span v-if="node.type === 'folder'" class="ml-auto pl-2">
          <FolderIcon class="h-4 w-4 text-muted-foreground" />
        </span>
        <!-- 拖拽手柄已移除 -->
      </div>
    </div>

    <!-- 匹配项节点 -->
    <div
      v-else-if="node.type === 'match'"
      class="match-node"
      @click="selectNode($event)"
    >
      <div
        class="flex items-center w-full px-0 py-1 rounded group"
        :class="{
          'bg-[linear-gradient(135deg,#2b5876,#4e4376)] text-primary-foreground': isSelected,
          'hover:bg-accent hover:text-accent-foreground': !isSelected,
        }"
      >
        <span class="w-4 inline-block"></span>
        <ZapIcon class="h-4 w-4 mr-1 text-blue-500" />
        <span class="text-sm cursor-grab flex-grow">
          <HighlightText
            v-if="searchQuery"
            :text="node.name"
            :searchQuery="selfMatchesSearch ? searchQuery : ''"
          />
          <template v-else>{{ node.name }}</template>
        </span>

        <!-- 描述信息 -->
        <div v-if="node.match?.description" class="ml-auto flex-1 text-right">
          <span
            class="text-xs text-muted-foreground truncate max-w-[200px] inline-block"
            :title="node.match.description"
          >
            <HighlightText
              v-if="searchQuery"
              :text="node.match.description"
              :searchQuery="selfMatchesSearch ? searchQuery : ''"
            />
            <template v-else>{{ node.match.description }}</template>
          </span>
        </div>

        <!-- 拖拽手柄已移除 -->
      </div>
    </div>

    <!-- 子节点 -->
    <div
      v-if="hasChildren && isOpen"
      class="children pl-2 pr-0 drop-zone"
      v-sortable="childSortableOptions"
      :data-parent-id="node.id"
      :data-container-type="node.type"
    >
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :parentId="node.id"
        :selected-id="selectedId"
        :searchQuery="searchQuery"
        :parentMatches="selfMatchesSearch || props.parentMatches"
        :draggable="props.draggable"
        @select="$emit('select', $event)"
        @move="$emit('move', $event)"
        @moveNode="$emit('moveNode', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch, onMounted, onUnmounted } from "vue";
import { ChevronRightIcon, ChevronDownIcon, ZapIcon, GripVerticalIcon, FolderIcon } from "lucide-vue-next";
import type { TreeNodeItem } from "./ConfigTree.vue";
import HighlightText from "./common/HighlightText.vue";
import Sortable from 'sortablejs'; // 导入 Sortable 类型

const props = defineProps<{
  node: TreeNodeItem;
  parentId?: string | null; // 添加 parentId prop
  selectedId?: string | null;
  searchQuery?: string;
  parentMatches?: boolean; // 父节点是否匹配搜索词
  draggable?: boolean; // 是否可拖拽
}>();

const emit = defineEmits<{
  (e: "select", node: TreeNodeItem): void;
  (e: "move", payload: { itemId: string; oldParentId: string | null; newParentId: string | null; oldIndex: number; newIndex: number }): void; // 现有规则/分组移动
  (e: "moveNode", payload: { nodeId: string; targetParentId: string | null; newIndex: number }): void; // 新增文件/文件夹移动
}>();

// 默认展开所有节点
const isOpen = ref(true);

// 当搜索查询存在时，确保节点展开
watch(() => props.searchQuery, (newQuery) => {
  if (newQuery && newQuery.trim() !== "") {
    isOpen.value = true;
  }
}, { immediate: true });

// 切换文件夹展开/折叠状态
const toggleFolder = (event: MouseEvent) => {
  // 移除拖拽句柄检查
  // if ((event.target as HTMLElement).closest('.drag-handle')) {
  //   return;
  // }
  isOpen.value = !isOpen.value;
};

const selectNode = (event: MouseEvent) => {
  // 移除拖拽句柄检查
  // if ((event.target as HTMLElement).closest('.drag-handle')) {
  //   return;
  // }
  emit("select", props.node);
};

const isSelected = computed(() => {
  return props.node.id === props.selectedId;
});

// Add/Modify displayName computed property
const displayName = computed(() => {
  if (props.node.type === "file" && props.node.name) {
    // Remove .yml or .yaml suffix
    return props.node.name.replace(/\.(yml|yaml)$/i, "");
  }
  // Return original name for other types or if name is missing
  return props.node.name || "";
});

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0;
});

// Helper function to check if a string matches the query regex
const checkMatch = (
  text: string | undefined | null,
  regex: RegExp
): boolean => {
  return text ? regex.test(text) : false;
};

// Function to escape regex special characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

// Computed: Check if this node's own data matches the search query
const selfMatchesSearch = computed(() => {
  const query = props.searchQuery?.trim();

  if (!query) return false;

  try {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(escapedQuery, "i"); // Case-insensitive regex

    const nodeType = props.node.type;

    // Check folder/file/group name
    if (nodeType !== 'match') {
      return checkMatch(props.node.name, regex);
    }

    // --- Match Node Checks ---
    if (props.node.match) {
      const match = props.node.match;

      // Check trigger or triggers array
      if (checkMatch(match.trigger, regex) ||
          (Array.isArray(match.triggers) && match.triggers.some(t => checkMatch(t, regex)))) {
        return true;
      }

      // Check other match fields
      if (
        checkMatch(match.label, regex) ||
        checkMatch(match.description, regex) ||
        checkMatch(match.replace?.toString(), regex) ||
        checkMatch(match.content?.toString(), regex) ||
        checkMatch(match.markdown?.toString(), regex) ||
        checkMatch(match.html?.toString(), regex) ||
        match.tags?.some((tag: string) => checkMatch(tag, regex)) ||
        match.search_terms?.some((term: string) => checkMatch(term, regex))
      ) {
        return true;
      }
    }

    // If no fields matched for a match node
    return false;

  } catch (e) {
    console.error("Invalid regex in TreeNode (selfMatchesSearch):", e);
    return false; // Treat invalid regex as no match
  }
});

// Computed: Check if any descendant node matches the search query
const descendantMatchesSearch = computed(() => {
  const query = props.searchQuery?.trim();
  if (!query || !hasChildren.value) return false;

  try {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(escapedQuery, "i");

    const checkDescendants = (nodes: TreeNodeItem[]): boolean => {
      for (const childNode of nodes) {
        let childSelfMatches = false;

        // Check name for folder/file/group
        if (childNode.type !== 'match' && checkMatch(childNode.name, regex)) {
           childSelfMatches = true;
        }
        // Check specific match fields for match type
        else if (childNode.type === "match" && childNode.match) {
          const match = childNode.match;
          if (
            // Check trigger or triggers
            checkMatch(match.trigger, regex) ||
            (Array.isArray(match.triggers) && match.triggers.some(t => checkMatch(t, regex))) ||
            // Check other fields
            checkMatch(match.label, regex) ||
            checkMatch(match.description, regex) ||
            checkMatch(match.replace?.toString(), regex) ||
            checkMatch(match.content?.toString(), regex) ||
            checkMatch(match.markdown?.toString(), regex) ||
            checkMatch(match.html?.toString(), regex) ||
            match.tags?.some((tag: string) => checkMatch(tag, regex)) ||
            match.search_terms?.some((term: string) => checkMatch(term, regex))
          ) {
            childSelfMatches = true;
          }
        }

        if (childSelfMatches) {
          return true; // Found a matching descendant
        }

        // Recursively check the child's descendants
        if (childNode.children && childNode.children.length > 0) {
          if (checkDescendants(childNode.children)) {
            return true; // Found a matching descendant deeper down
          }
        }
      }
      return false; // No matching descendant found in this branch
    };

    return checkDescendants(props.node.children);
  } catch (e) {
    console.error("Invalid regex in TreeNode (descendant check):", e);
    return false;
  }
});

// Computed: Determine if the node should be visible
const isVisible = computed(() => {
  const noSearch = !props.searchQuery?.trim();
  const selfMatch = selfMatchesSearch.value;
  const descendantMatch = descendantMatchesSearch.value;
  const parentMatch = props.parentMatches;

  const visible = noSearch || parentMatch || selfMatch || descendantMatch;

  console.log(`[TreeNode ${props.node.name}] isVisible check:`, {
    noSearch,
    parentMatch,
    selfMatch,
    descendantMatch,
    searchQuery: props.searchQuery,
    result: visible
  });

  // Always visible if there is no search query
  if (noSearch) {
    return true;
  }

  // 如果父节点匹配搜索词，则子节点也应该可见
  if (parentMatch) {
    return true;
  }

  // 如果节点本身匹配搜索词，则节点应该可见
  if (selfMatch) {
    return true;
  }

  // 如果节点的子节点匹配搜索词，则节点应该可见
  if (descendantMatch) {
    return true;
  }

  // 如果搜索查询存在，但节点本身和子节点都不匹配，且父节点也不匹配，则节点不可见
  return false;
});

// Auto-expand node if it becomes visible due to search
watch(isVisible, (newValue, oldValue) => {
  if (newValue && !oldValue && props.searchQuery?.trim()) {
    isOpen.value = true;
  }
  // Optional: Collapse when search is cleared and it wasn't originally open?
  // We might want to preserve user's manual open/close state.
});

// Watch for search query clearing to potentially reset state if needed
// watch(() => props.searchQuery, (newQuery) => {
//   if (!newQuery?.trim()) {
//      // Reset isOpen? Or keep user state?
//   }
// });

// 计算可见子节点数量
const visibleChildCount = computed(() => {
  if (!props.node.children) return 0;

  if (!props.searchQuery || props.searchQuery.trim() === "") {
    // 如果没有搜索查询，使用原来的计算逻辑
    if (props.node.type === "folder" || props.node.type === "file") {
      // 递归计算所有匹配项的数量
      let count = 0;
      const countItems = (nodes: TreeNodeItem[]) => {
        for (const node of nodes) {
          if (node.type === "match") {
            count++;
          } else if (node.children) {
            countItems(node.children);
          }
        }
      };
      countItems(props.node.children);
      return count;
    } else if (props.node.type === "group") {
      // 只计算直接子节点中的匹配项数量
      return props.node.children.filter((child) => child.type === "match")
        .length;
    }

    return 0;
  }

  // 如果有搜索查询，计算可见子节点数量
  const countVisibleItems = (nodes: TreeNodeItem[]): number => {
    let count = 0;

    for (const node of nodes) {
      const query = props.searchQuery!.toLowerCase();
      let nodeVisible = false;

      // 检查节点本身是否匹配
      if (node.name && node.name.toLowerCase().includes(query)) {
        nodeVisible = true;
      } else if (node.type === "match" && node.match) {
        const match = node.match;

        // 检查匹配项特有字段
        if (
          (match.trigger && match.trigger.toLowerCase().includes(query)) ||
          (match.label && match.label.toLowerCase().includes(query)) ||
          (match.description &&
            match.description.toLowerCase().includes(query)) ||
          (match.replace &&
            match.replace.toString().toLowerCase().includes(query)) ||
          (match.content &&
            match.content.toString().toLowerCase().includes(query)) ||
          (match.markdown &&
            match.markdown.toString().toLowerCase().includes(query)) ||
          (match.html && match.html.toString().toLowerCase().includes(query)) ||
          (match.tags &&
            Array.isArray(match.tags) &&
            match.tags.some((tag) => tag.toLowerCase().includes(query))) ||
          (match.search_terms &&
            Array.isArray(match.search_terms) &&
            match.search_terms.some((term) =>
              term.toLowerCase().includes(query)
            ))
        ) {
          nodeVisible = true;
        }
      } else if (
        node.type === "group" &&
        node.group &&
        node.group.name &&
        node.group.name.toLowerCase().includes(query)
      ) {
        nodeVisible = true;
      }

      // 检查子节点是否匹配
      let childrenVisible = false;
      if (node.children && node.children.length > 0) {
        const childCount = countVisibleItems(node.children);
        if (childCount > 0) {
          childrenVisible = true;
          count += childCount;
        }
      }

      // 如果节点本身匹配且是匹配项，计数加1
      if (nodeVisible && node.type === "match") {
        count++;
      }
    }

    return count;
  };

  return countVisibleItems(props.node.children);
});

// 当搜索查询变化时，自动展开所有节点已在上面实现

// 当父节点匹配搜索词时，自动展开子节点
watch(() => props.parentMatches, (newValue) => {
  if (newValue && props.searchQuery?.trim()) {
    isOpen.value = true;
  }
}, { immediate: true });

// 处理子节点列表的 SortableJS 更新事件
const handleChildSortUpdate = (event: Sortable.SortableEvent) => {
  console.log('[TreeNode SortableJS onUpdate]', event);
  const { item, from, to, oldIndex, newIndex } = event;

  if (oldIndex === undefined || newIndex === undefined) return;

  const itemId = item.dataset.id; // 需要在 TreeNode 根元素上添加 data-id
  if (!itemId) {
    console.error('Dragged item missing data-id!');
    return;
  }

  // 获取拖拽项的类型
  const draggedType = item.dataset.nodeType;

  // 获取目标容器的类型
  const targetContainerType = to.dataset.containerType || '';

  // 检查是否是跨容器拖拽
  const isCrossContainer = from !== to;

  // 如果是match或group类型，且目标容器是folder类型，则禁止拖拽
  if ((draggedType === 'match' || draggedType === 'group') && targetContainerType === 'folder') {
    console.log('禁止拖拽：match/group不能拖入folder');
    return;
  }

  // 如果是match或group类型，且目标容器不是file、group或root类型，则禁止拖拽
  if ((draggedType === 'match' || draggedType === 'group') &&
      targetContainerType !== 'file' && targetContainerType !== 'group' && targetContainerType !== 'root') {
    console.log('禁止拖拽：match/group只能拖入file/group/root');
    return;
  }

  // 确定正确的父节点ID
  const oldParentId = from.dataset.parentId || null;
  const newParentId = to.dataset.parentId || null;

  console.log(`[TreeNode handleChildSortUpdate] 拖拽项 ${itemId} (${draggedType}) 从 ${oldParentId} (${from.dataset.containerType}) 到 ${newParentId} (${targetContainerType})`);

  // 触发move事件，传递正确的父节点ID
  emit('move', {
    itemId: itemId,
    oldParentId: oldParentId,
    newParentId: newParentId,
    oldIndex: oldIndex,
    newIndex: newIndex,
  });
};

// 子列表的 SortableJS 选项
const childSortableOptions = computed(() => ({
  group: 'configTreeGroup', // 允许在所有TreeNode的children之间拖拽
  animation: 150,
  fallbackOnBody: true,
  swapThreshold: 0.65,
  handle: '.cursor-grab', // 使用特定的拖拽手柄
  onMove: handleDragMove, // 添加 onMove 校验
  onEnd: handleSortEnd, // 修改 onEnd 处理逻辑
  filter: '.ignore-drag', // 类名，阻止某些元素触发拖拽
  preventOnFilter: true, // 阻止在过滤元素上的拖拽
}));

// SortableJS onMove 回调：校验是否允许放置
const handleDragMove = (event: Sortable.MoveEvent): boolean => {
  const draggedElement = event.dragged; // 被拖拽的元素 (TreeNode div)
  const targetContainer = event.to; // 目标容器 (div.children)

  const draggedNodeType = draggedElement.dataset.nodeType as TreeNodeItem['type'] | undefined;
  const targetContainerType = targetContainer.dataset.containerType as TreeNodeItem['type'] | 'root' | undefined; // 'root' for ConfigTree top-level
  const targetParentId = targetContainer.dataset.parentId; // Get parent ID from target container

  // console.log(`[TreeNode onMove] Dragged: ${draggedNodeType} (${draggedElement.dataset.id}), Target Container Type: ${targetContainerType} (Parent ID: ${targetParentId})`);

  if (!draggedNodeType || !targetContainerType) {
    // console.warn('[TreeNode onMove] Missing node type or container type. Denying move.');
    return false; // Cannot determine types, deny move
  }

  // --- 规则/分组 (Match/Group) 的移动规则 ---
  if (draggedNodeType === 'match' || draggedNodeType === 'group') {
    // 规则/分组只能移动到 文件(file) 或 分组(group) 容器中
    const allowedContainerTypes: Array<TreeNodeItem['type'] | 'root'> = ['file', 'group'];
    if (!allowedContainerTypes.includes(targetContainerType)) {
      // console.log(`[TreeNode onMove] Denied: ${draggedNodeType} cannot move into ${targetContainerType}`);
      return false;
    }
  }
  // --- 文件 (File) 的移动规则 ---
  else if (draggedNodeType === 'file') {
    // 文件只能移动到 文件夹(folder) 或 根(root) 容器中
    const allowedContainerTypes: Array<TreeNodeItem['type'] | 'root'> = ['folder', 'root'];
     if (!allowedContainerTypes.includes(targetContainerType)) {
      // console.log(`[TreeNode onMove] Denied: ${draggedNodeType} cannot move into ${targetContainerType}`);
      return false;
    }
  }
  // --- 文件夹 (Folder) 的移动规则 ---
  else if (draggedNodeType === 'folder') {
     // 文件夹只能移动到 文件夹(folder) 或 根(root) 容器中
    const allowedContainerTypes: Array<TreeNodeItem['type'] | 'root'> = ['folder', 'root'];
    if (!allowedContainerTypes.includes(targetContainerType)) {
      // console.log(`[TreeNode onMove] Denied: ${draggedNodeType} cannot move into ${targetContainerType}`);
      return false;
    }
    // 防止文件夹拖到自身内部
    if (draggedElement.dataset.id === targetParentId) {
      // console.log('[TreeNode onMove] Denied: Cannot move folder into itself.');
      return false;
    }
    // 防止文件夹拖入其子文件夹 (需要递归检查，暂时简化，不允许直接拖入)
    // A more robust check would involve traversing up from the target to see if the dragged folder is an ancestor.
    // For simplicity now, we might allow it and rely on the user not doing this, or add the check later.
  }

  // console.log('[TreeNode onMove] Allowed move.');
  return true; // Allow move if rules pass
};

// SortableJS onEnd 回调：处理拖拽结束事件
const handleSortEnd = (event: Sortable.SortableEvent) => {
  console.log('[TreeNode handleSortEnd] Event triggered:', event);
  const { item, from, to, oldIndex, newIndex } = event;

  if (oldIndex === undefined || newIndex === undefined) {
      console.log('[TreeNode handleSortEnd] Exiting: oldIndex or newIndex is undefined.');
      return;
  }

  const itemId = item.dataset.id; // ID of the dragged item (Match, Group, File, Folder)
  const itemType = item.dataset.nodeType as TreeNodeItem['type'] | undefined;
  // Ensure parent IDs are null if 'root' or undefined
  const oldParentId = from.dataset.parentId === 'root' || from.dataset.parentId === undefined ? null : from.dataset.parentId;
  const newParentId = to.dataset.parentId === 'root' || to.dataset.parentId === undefined ? null : to.dataset.parentId;

  console.log(`[TreeNode handleSortEnd] Processing - Item ID: ${itemId}, Type: ${itemType}, Old Parent: ${oldParentId}, New Parent: ${newParentId}, Old Index: ${oldIndex}, New Index: ${newIndex}`);

  if (!itemId || !itemType) {
    console.error('[TreeNode handleSortEnd] Exiting: Missing item ID or type.');
    return;
  }

  // 检查是否真的移动了位置 (不同父容器或不同索引)
  if (from === to && oldIndex === newIndex) {
    console.log('[TreeNode handleSortEnd] Exiting: No actual move detected.');
    return; // No change
  }

  // --- 根据拖拽的节点类型，触发不同的事件 ---
  if (itemType === 'match' || itemType === 'group') {
    // 规则或分组的移动 -> 触发 'move' 事件给 ConfigTree 处理
    console.log(`[TreeNode handleSortEnd] Emitting 'move' for ${itemType} with ID ${itemId}`);
    emit('move', {
      itemId,
      oldParentId, // Use the processed ID
      newParentId, // Use the processed ID
      oldIndex,
      newIndex,
    });
  } else if (itemType === 'file' || itemType === 'folder') {
    // 文件或文件夹的移动 -> 触发 'moveNode' 事件给 ConfigTree 处理
    console.log(`[TreeNode handleSortEnd] Emitting 'moveNode' for ${itemType} with ID ${itemId}`);
    emit('moveNode', {
      nodeId: itemId,
      targetParentId: newParentId, // Use the processed ID (already null if root/undefined)
      newIndex,
    });
  } else {
      console.warn(`[TreeNode handleSortEnd] Exiting: Unknown itemType: ${itemType}`);
  }
};

// 监听选中 ID 的变化
watch(() => props.selectedId, (newId) => {
  // console.log(`[TreeNode ${props.node.id}] Selected ID changed to: ${newId}`);
  // ... existing code ...
});

// 创建一个全局组件实例映射，用于在拖拽时访问组件实例
// 这样可以直接修改组件的状态，而不是通过DOM操作
const treeNodeInstances = new Map<string, { isOpen: any }>();

// 注册当前组件实例
onMounted(() => {
  if (props.node.id) {
    treeNodeInstances.set(props.node.id, { isOpen });
  }
});

// 在组件卸载时移除实例
onUnmounted(() => {
  if (props.node.id) {
    treeNodeInstances.delete(props.node.id);
  }
});

// 辅助函数：尝试查找HTML元素对应的TreeNode组件实例
const findTreeNodeComponent = (element: HTMLElement): any => {
  // 尝试查找最近的tree-node元素
  const treeNodeEl = element.closest('.tree-node');
  if (!treeNodeEl) return null;

  // 获取节点ID
  const nodeId = treeNodeEl.getAttribute('data-id');
  if (!nodeId) return null;

  // 尝试从映射中获取组件实例
  const instance = treeNodeInstances.get(nodeId);
  if (instance) {
    return instance;
  }

  // 备用方案：通过DOM操作
  const chevronIcon = treeNodeEl.querySelector('.ChevronDownIcon, .ChevronRightIcon');
  if (chevronIcon) {
    // 模拟点击折叠图标
    chevronIcon.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
    return true;
  }

  return null;
};

// 公共方法：折叠节点
const collapseNode = () => {
  if (hasChildren.value) {
    isOpen.value = false;
  }
};
</script>

<style scoped>
.tree-node {
  margin-bottom: 0.25rem;
  width: 100%;
}

.children {
  margin-top: 0.25rem;
  width: 100%;
}

/* 确保所有节点内容占据整行 */
.folder-node,
.file-node,
.group-node,
.match-node {
  width: 100%;
}

/* 描述文本溢出处理 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 拖拽句柄样式 */
.drag-handle {
  touch-action: none;
  transition: opacity 0.2s;
}

.drag-handle:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

/* 确保被拖拽的节点在拖拽过程中保持折叠状态 */
.being-dragged .children,
.sortable-fallback .children,
.sortable-ghost .children {
  display: none !important;
}
</style>
