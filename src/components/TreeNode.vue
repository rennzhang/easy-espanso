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
        <span class="mr-1 text-muted-foreground cursor-grab" v-if="hasChildren">
          <ChevronRightIcon v-if="!isOpen" class="h-4 w-4" />
          <ChevronDownIcon v-else class="h-4 w-4" />
        </span>
        <span class="mr-1 text-muted-foreground" v-else>
          <span class="w-4 inline-block"></span>
        </span>
        <span class="text-sm font-medium cursor-grab flex-grow">
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
        <!-- 拖拽手柄 -->
        <span class="cursor-grab ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVerticalIcon class="h-4 w-4 text-muted-foreground" />
        </span>
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

        <!-- 拖拽手柄 -->
        <span class="cursor-grab ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVerticalIcon class="h-4 w-4 text-muted-foreground" />
        </span>
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
  (e: "move", payload: { itemId: string; oldParentId: string | null; newParentId: string | null; oldIndex: number; newIndex: number }): void; // 添加 move 事件
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
  group: 'nested-tree',
  animation: 150,
  ghostClass: 'sortable-ghost',
  dragClass: 'sortable-drag',
  fallbackOnBody: true,       // 允许拖拽到整个body区域
  swapThreshold: 0.65,        // 交换阈值
  handle: '.cursor-grab',     // 只允许通过.cursor-grab元素拖拽
  emptyInsertThreshold: 10,   // 插入空列表的距离阈值
  onStart: (evt: Sortable.SortableEvent) => {
    console.log(`[TreeNode ${props.node.name} SortableJS onStart]`, evt);
    document.body.classList.add('dragging-active');
    // 为拖拽的父容器添加一个特殊类，使其显示为可放置区域
    if (evt.from) {
      evt.from.classList.add('sortable-source');
    }

    // 获取被拖拽元素的相关信息
    const draggedItemId = evt.item.dataset.id;
    const draggedItemType = evt.item.dataset.nodeType;

    // 如果拖拽的是文件夹或分组，自动折叠它
    if (draggedItemType === 'folder' || draggedItemType === 'group' || draggedItemType === 'file') {
      // 找到拖拽元素的TreeNode组件实例
      const draggedNode = findTreeNodeComponent(evt.item);
      if (draggedNode) {
        // 将节点折叠
        if (typeof draggedNode.isOpen === 'object' && draggedNode.isOpen.value !== undefined) {
          // 如果是响应式对象
          draggedNode.isOpen.value = false;
        } else if (typeof draggedNode === 'boolean') {
          // 如果是通过DOM操作返回的成功状态
          // 已经通过模拟点击处理了
        } else {
          // 直接尝试DOM操作
          const childrenContainer = evt.item.querySelector('.children');
          if (childrenContainer) {
            (childrenContainer as HTMLElement).style.display = 'none';
          }
        }
      } else {
        // 备用方案：直接隐藏子容器
        const childrenContainer = evt.item.querySelector('.children');
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
    console.log(`[TreeNode ${props.node.name} SortableJS onEnd]`, evt);
    document.body.classList.remove('dragging-active');
    // 移除所有可能存在的sortable特殊标记类
    document.querySelectorAll('.sortable-source').forEach(el => {
      el.classList.remove('sortable-source');
    });

    // 移除所有指示线
    document.querySelectorAll('.insert-indicator').forEach(el => el.remove());

    // 检查是否在安全区域内结束拖拽
    const targetContainer = evt.to;
    const isInSafeZone = targetContainer.classList.contains('drop-zone') ||
                         !!targetContainer.closest('.drop-zone');

    // 如果不在安全区域内，不触发move事件，元素会自动返回原位置
    if (!isInSafeZone) {
      console.log(`[TreeNode ${props.node.name} SortableJS onEnd] 拖拽取消：不在安全区域内`);
      return;
    }

    // 检查是否是跨容器拖拽
    const isCrossContainer = evt.from !== evt.to;
    if (isCrossContainer) {
      console.log(`[TreeNode ${props.node.name} SortableJS onEnd] 检测到跨容器拖拽，处理数据更新`);

      // 获取必要的数据
      const { item, from, to, oldIndex, newIndex } = evt;
      if (oldIndex === undefined || newIndex === undefined) return;

      const itemId = item.dataset.id;
      if (!itemId) {
        console.error('Dragged item missing data-id!');
        return;
      }

      // 获取拖拽项的类型
      const draggedType = item.dataset.nodeType;

      // 获取目标容器的类型
      const targetContainerType = to.dataset.containerType || '';

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

      // 获取父容器ID
      const oldParentId = from.dataset.parentId || null;
      const newParentId = to.dataset.parentId || null;

      // 触发move事件
      try {
        emit('move', {
          itemId: itemId,
          oldParentId: oldParentId,
          newParentId: newParentId,
          oldIndex: oldIndex,
          newIndex: newIndex,
        });
      } catch (error) {
        console.error('[TreeNode onEnd] 处理跨容器拖拽时出错:', error);
      }
    }
  },
  onUpdate: handleChildSortUpdate,
  // 新增：设置该容器的父级ID，用于识别
  setData: (dataTransfer: DataTransfer, dragEl: HTMLElement) => {
    // 设置父节点ID到拖动元素
    dataTransfer.setData('parentId', props.node.id);
    dragEl.dataset.parentId = props.node.id;
  }
}));

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
