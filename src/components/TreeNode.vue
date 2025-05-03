<template>
  <div
    class="tree-node w-full"
    v-if="isVisible"
    :id="`tree-node-${node.id}`"
    :data-id="node.id"
    :data-node-type="node.type"
    :data-node-name="node.name"
  >
    <!-- Wrap ALL node types with NodeContextMenu -->
    <NodeContextMenu :node="node" :is-selected="isSelected">
      <!-- The actual node display content goes here -->
      <!-- Non-match nodes (group, folder, file) -->
      <div v-if="node.type !== 'match'" class="w-full">
        <div
          :class="[
            node.name === 'Packages'
              ? 'package-node'
              : node.type + '-node',
          ]"
          @click="handleClick"
          class="cursor-pointer w-full"
        >
          <div
            class="flex items-center w-full py-1.5 group node-row"
            :class="{
              'bg-[linear-gradient(135deg,#2b5876,#4e4376)] text-primary-foreground':
                node.type === 'group' && isSelected,
              'bg-[linear-gradient(135deg,#4a6c6f,#377f85)] text-primary-foreground':
                (node.type === 'file' || node.type === 'folder') && isSelected,
              'hover:text-accent-foreground': !isSelected,
              'bg-gray-200': (node.type === 'file' || node.type === 'folder') && !isSelected,
            }"
            :style="{
              paddingLeft: nodeLevel * 20 + 'px',
              '--node-level': nodeLevel,
            }"
          >
            <!-- 添加左侧空白区域点击处理 -->
            <div
              class="absolute left-0 h-full"
              :style="{width: nodeLevel * 20 + 'px'}"
              @click.stop="toggleFolder"
            ></div>

            <span
              class="mr-1 ml-4 text-muted-foreground cursor-pointer"
              :class="{ 'text-white': isSelected }"
              @click.stop="toggleFolder"
            >
              <ChevronRightIcon v-if="hasChildren && !isOpen" class="h-4 w-4" />
              <ChevronDownIcon
                v-else-if="hasChildren && isOpen"
                class="h-4 w-4"
              />
              <span v-else class="w-4 inline-block"></span>
            </span>
            <!-- 文件夹图标放在名称前面 -->
            <span v-if="node.type === 'folder'" class="mr-1.5">
              <FolderIcon
                :class="[
                  'h-5 w-5', // 增大图标尺寸
                  isSelected ? 'text-white' : 'text-blue-500' // 使用更显眼的蓝色
                ]"
              />
            </span>
            <!-- 分组图标放在名称前面 -->
            <span v-if="node.type === 'group'" class="mr-1.5">
              <GitBranchIcon
                :class="[
                  'h-4 w-4',
                  isSelected ? 'text-white' : 'text-muted-foreground'
                ]"
              />
            </span>
            <span
              class="text-sm font-medium flex-grow cursor-pointer"
              @click.stop="selectNode"
            >
              <HighlightText
                v-if="searchQuery"
                :text="displayName"
                :searchQuery="selfMatchesSearch ? searchQuery : ''"
              />
              <template v-else>{{ displayName }}</template>
            </span>
            <span
              v-if="visibleChildCount > 0 && shouldShowCount"
              class="mx-2 text-xs px-1.5 py-0.5 rounded-full"
              :class="isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'"
            >
              {{ visibleChildCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- Match node -->
      <div v-else class="w-full">
        <div class="match-node w-full" @click="selectNode">
          <div
            class="flex items-center w-full py-1.5 group node-row"
            :class="{
              'bg-[linear-gradient(135deg,#2b5876,#4e4376)] text-primary-foreground':
                isSelected,
                'hover:text-accent-foreground bg-gray-50': !isSelected,
            }"
            :style="{
              paddingLeft: nodeLevel * 20 + 8 + 'px',
              '--node-level': nodeLevel,
            }"
          >
            <!-- 添加左侧空白区域点击处理 -->
            <div
              class="absolute left-0 h-full"
              :style="{width: nodeLevel * 20 + 'px'}"
              @click.stop="toggleParentFolder"
            ></div>

            <span class="w-4 inline-block"></span>
            <!-- Indent space -->
            <ZapIcon
              :class="[
                'h-4 w-4 mr-1',
                isSelected ? 'text-white' : 'text-blue-500'
              ]"
            />
            <span class="text-sm cursor-grab flex-grow">
              <HighlightText
                v-if="searchQuery"
                :text="node.name"
                :searchQuery="selfMatchesSearch ? searchQuery : ''"
              />
              <template v-else>{{ node.name }}</template>
            </span>
            <div
              v-if="node.match?.description"
              class="ml-auto flex-1 text-right"
            >
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
          </div>
        </div>
      </div>
    </NodeContextMenu>

    <!-- Children (recursive TreeNode) -->
    <Transition name="expand">
      <VueDraggable
        v-if="hasChildren && isOpen"
        v-model="node.children"
        class="children w-full drop-zone"
        :class="{
          'shadow-[inset_0_6px_6px_-6px_rgba(0,0,0,0.21),_inset_0_-6px_6px_-6px_rgba(0,0,0,0.21)]':
            node.type === 'file' ||
            (node.type === 'folder' &&
              node.path &&
              node.path.toLowerCase().startsWith('packages/') &&
              node.path.toLowerCase() !== 'packages'),
        }"
        :group="{ name: 'configTreeGroup', pull: true, put: true }"
        :animation="150"
        handle=".cursor-grab"
        :move="handleDragMove"
        @end="handleDragEnd"
        item-key="id"
        tag="div"
        :data-parent-id="node.id"
        :data-container-type="node.type"
        :disabled="!props.draggable"
        :fallbackOnBody="true"
        :swapThreshold="0.65"
        filter=".ignore-drag"
        :preventOnFilter="true"
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
          :level="nodeLevel + 1"
          @select="$emit('select', $event)"
          @move="$emit('move', $event)"
          @moveNode="$emit('moveNode', $event)"
          @request-rename="$emit('request-rename', $event)"
          @toggle-node="$emit('toggle-node', $event)"
          class="drag-item"
        />
      </VueDraggable>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  defineProps,
  defineEmits,
  watch,
  onMounted,
  onUnmounted,
} from "vue";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  ZapIcon,
  FolderIcon,
  GitBranchIcon,
} from "lucide-vue-next";
import type { TreeNodeItem } from "@/components/ConfigTree.vue";
import HighlightText from "@/components/common/HighlightText.vue";
import { VueDraggable } from "vue-draggable-plus";
import NodeContextMenu from "@/components/NodeContextMenu.vue";
import { useEspansoStore } from "@/store/useEspansoStore";
import TreeNodeRegistry from "@/utils/TreeNodeRegistry";

const props = defineProps<{
  node: TreeNodeItem;
  parentId?: string | null;
  selectedId?: string | null;
  searchQuery?: string;
  parentMatches?: boolean;
  draggable?: boolean;
  level?: number;
}>();

const emit = defineEmits<{
  (e: "select", node: TreeNodeItem): void;
  (
    e: "move",
    payload: {
      itemId: string;
      oldParentId: string | null;
      newParentId: string | null;
      oldIndex: number;
      newIndex: number;
    }
  ): void;
  (
    e: "moveNode",
    payload: { nodeId: string; targetParentId: string | null; newIndex: number }
  ): void;
  (e: "request-rename", item: TreeNodeItem): void;
  (e: "toggle-node", nodeId: string): void;
}>();

const store = useEspansoStore();

// 默认展开状态：Packages 文件夹默认收起，其他节点默认展开
const isOpen = ref(props.node.name === 'Packages' ? false : true);

watch(
  () => props.searchQuery,
  (newQuery) => {
    if (newQuery && newQuery.trim() !== "") {
      isOpen.value = true;
    }
  },
  { immediate: true }
);

const toggleFolder = (event?: MouseEvent) => {
  if (props.node.type !== "match" && hasChildren.value) {
    emit("toggle-node", props.node.id);
    isOpen.value = !isOpen.value;

    // 同步更新 TreeNodeRegistry 中的状态
    if (isOpen.value) {
      // 如果展开，则展开当前节点及子节点
      TreeNodeRegistry.expandNodeAndChildren(props.node.id);
    } else {
      // 如果收起，则收起当前节点及子节点
      TreeNodeRegistry.collapseNodeAndChildren(props.node.id);
    }
  }
};

const selectNode = () => {
  // 如果是文件夹类型节点，则不执行选择操作
  if (props.node.type === 'folder') {
    return;
  }
  emit("select", props.node);
};

const isSelected = computed(() => {
  return props.node.id === props.selectedId;
});

const displayName = computed(() => {
  if (props.node.type === "file" && props.node.name) {
    return props.node.name.replace(/\.(yml|yaml)$/i, "");
  }
  return props.node.name || "";
});

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0;
});

const checkMatch = (
  text: string | undefined | null,
  regex: RegExp
): boolean => {
  return text ? regex.test(text) : false;
};

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const selfMatchesSearch = computed(() => {
  const query = props.searchQuery?.trim();

  if (!query) return false;

  try {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(escapedQuery, "i");

    const nodeType = props.node.type;

    if (nodeType !== "match") {
      return checkMatch(props.node.name, regex);
    }

    if (props.node.match) {
      const match = props.node.match;

      if (
        checkMatch(match.trigger, regex) ||
        (Array.isArray(match.triggers) &&
          match.triggers.some((t) => checkMatch(t, regex)))
      ) {
        return true;
      }

      if (
        checkMatch(match.label, regex) ||
        checkMatch(match.description, regex) ||
        checkMatch(match.replace?.toString(), regex)
      ) {
        return true;
      }
    }

    return false;
  } catch (e) {
    console.error("Invalid regex in TreeNode (selfMatchesSearch):", e);
    return false;
  }
});

const descendantMatchesSearch = computed(() => {
  const query = props.searchQuery?.trim();
  if (!query || !hasChildren.value || props.node.children.length === 0)
    return false;

  try {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(escapedQuery, "i");

    const checkDescendants = (nodes: TreeNodeItem[]): boolean => {
      return nodes.some((childNode) => {
        if (childNode.type !== "match" && checkMatch(childNode.name, regex)) {
          return true;
        } else if (childNode.type === "match" && childNode.match) {
          const match = childNode.match;
          if (
            checkMatch(match.trigger, regex) ||
            (Array.isArray(match.triggers) &&
              match.triggers.some((t) => checkMatch(t, regex))) ||
            checkMatch(match.label, regex) ||
            checkMatch(match.description, regex) ||
            checkMatch(match.replace?.toString(), regex)
          ) {
            return true;
          }
        }

        if (childNode.children && childNode.children.length > 0) {
          return checkDescendants(childNode.children);
        }

        return false;
      });
    };

    return checkDescendants(props.node.children);
  } catch (e) {
    console.error("Invalid regex in TreeNode (descendant check):", e);
    return false;
  }
});

const isVisible = computed(() => {
  if (!props.searchQuery?.trim()) return true;

  if (props.parentMatches) return true;

  if (selfMatchesSearch.value) return true;

  return descendantMatchesSearch.value;
});

watch(isVisible, (newValue, oldValue) => {
  if (newValue && !oldValue && props.searchQuery?.trim()) {
    isOpen.value = true;
  }
});

const nodeCountCache = new Map<string, number>();

const visibleChildCount = computed(() => {
  if (!props.node.children) return 0;

  // 没有搜索时，简单统计匹配项数量
  if (!props.searchQuery || props.searchQuery.trim() === "") {
    if (props.node.type === "folder" || props.node.type === "file") {
      // 使用节点ID作为缓存键
      const cacheKey = props.node.id;

      // 检查缓存
      if (nodeCountCache.has(cacheKey)) {
        return nodeCountCache.get(cacheKey)!;
      }

      let count = 0;
      // 简化递归计算
      const countItems = (nodes: TreeNodeItem[]) => {
        for (const node of nodes) {
          if (node.type === "match") {
            count++;
          } else if (node.children && node.children.length > 0) {
            countItems(node.children);
          }
        }
      };
      countItems(props.node.children);

      // 存入缓存
      nodeCountCache.set(cacheKey, count);
      return count;
    } else if (props.node.type === "group") {
      // 直接统计节点下的匹配项
      return props.node.children.filter((child) => child.type === "match")
        .length;
    }

    return 0;
  }

  // 搜索时简化计算逻辑
  const query = props.searchQuery!.toLowerCase();

  // 只计算匹配的数量，无需处理视觉效果
  return props.node.children.reduce((count, node) => {
    let matches = 0;

    // 检查节点自身是否匹配
    if (node.name && node.name.toLowerCase().includes(query)) {
      if (node.type === "match") matches++;
    } else if (node.type === "match" && node.match) {
      const match = node.match;
      // 只检查关键字段
      if (
        (match.trigger && match.trigger.toLowerCase().includes(query)) ||
        (match.label && match.label.toLowerCase().includes(query)) ||
        (match.description &&
          match.description.toLowerCase().includes(query)) ||
        (match.replace &&
          match.replace.toString().toLowerCase().includes(query))
      ) {
        matches++;
      }
    }

    // 只有父节点类型才递归检查子节点
    if (
      (node.type === "folder" ||
        node.type === "file" ||
        node.type === "group") &&
      node.children &&
      node.children.length > 0
    ) {
      // 创建一个临时TreeNode实例并复用visibleChildCount逻辑
      const tempProps = {
        node,
        searchQuery: props.searchQuery,
        parentMatches: node.name && node.name.toLowerCase().includes(query),
      };

      // 简化递归调用
      let childMatches = 0;
      for (const child of node.children) {
        if (child.type === "match") {
          // 匹配检查
          const childMatch = child.match;
          if (
            childMatch &&
            ((childMatch.trigger &&
              childMatch.trigger.toLowerCase().includes(query)) ||
              (childMatch.label &&
                childMatch.label.toLowerCase().includes(query)) ||
              (childMatch.description &&
                childMatch.description.toLowerCase().includes(query)))
          ) {
            childMatches++;
          }
        }
      }

      matches += childMatches;
    }

    return count + matches;
  }, 0);
});

watch(
  () => props.parentMatches,
  (newValue) => {
    if (newValue && props.searchQuery?.trim()) {
      isOpen.value = true;
    }
  },
  { immediate: true }
);

const handleDragEnd = (event: any) => {
  console.log("[TreeNode handleDragEnd] Event triggered:", event);
  const { item, to, from, oldIndex, newIndex } = event;

  if (oldIndex === undefined || newIndex === undefined) {
    console.log(
      "[TreeNode handleDragEnd] Exiting: oldIndex or newIndex is undefined."
    );
    return;
  }

  const itemId = item.dataset.id;
  const itemType = item.dataset.nodeType as TreeNodeItem["type"] | undefined;
  const oldParentId =
    from.dataset.parentId === "root" || from.dataset.parentId === undefined
      ? null
      : from.dataset.parentId;
  const newParentId =
    to.dataset.parentId === "root" || to.dataset.parentId === undefined
      ? null
      : to.dataset.parentId;

  console.log(
    `[TreeNode handleDragEnd] Processing - Item ID: ${itemId}, Type: ${itemType}, Old Parent: ${oldParentId}, New Parent: ${newParentId}, Old Index: ${oldIndex}, New Index: ${newIndex}`
  );

  if (!itemId || !itemType) {
    console.error("[TreeNode handleDragEnd] Exiting: Missing item ID or type.");
    return;
  }

  if (from === to && oldIndex === newIndex) {
    console.log("[TreeNode handleDragEnd] Exiting: No actual move detected.");
    return;
  }

  if (itemType === "match" || itemType === "group") {
    console.log(
      `[TreeNode handleDragEnd] Emitting 'move' for ${itemType} with ID ${itemId}`
    );
    emit("move", {
      itemId,
      oldParentId,
      newParentId,
      oldIndex,
      newIndex,
    });
  } else if (itemType === "file" || itemType === "folder") {
    console.log(
      `[TreeNode handleDragEnd] Emitting 'moveNode' for ${itemType} with ID ${itemId}`
    );
    const numericNewIndex = typeof newIndex === "number" ? newIndex : 0;
    emit("moveNode", {
      nodeId: itemId,
      targetParentId: newParentId,
      newIndex: numericNewIndex,
    });
  } else {
    console.warn(
      `[TreeNode handleDragEnd] Exiting: Unknown itemType: ${itemType}`
    );
  }
};

const handleDragMove = (event: any): boolean => {
  const draggedElement = event.dragged;
  const targetContainer = event.to;

  const draggedNodeType = draggedElement.dataset.nodeType as
    | TreeNodeItem["type"]
    | undefined;
  const targetContainerType = targetContainer.dataset.containerType as
    | TreeNodeItem["type"]
    | "root"
    | undefined;
  const targetParentId = targetContainer.dataset.parentId;

  if (!draggedNodeType || !targetContainerType) {
    return false;
  }

  if (draggedNodeType === "match" || draggedNodeType === "group") {
    const allowedContainerTypes: Array<TreeNodeItem["type"] | "root"> = [
      "file",
      "group",
    ];
    if (!allowedContainerTypes.includes(targetContainerType)) {
      return false;
    }
  } else if (draggedNodeType === "file") {
    const allowedContainerTypes: Array<TreeNodeItem["type"] | "root"> = [
      "folder",
      "root",
    ];
    if (!allowedContainerTypes.includes(targetContainerType)) {
      return false;
    }
  } else if (draggedNodeType === "folder") {
    const allowedContainerTypes: Array<TreeNodeItem["type"] | "root"> = [
      "folder",
      "root",
    ];
    if (!allowedContainerTypes.includes(targetContainerType)) {
      return false;
    }
    if (draggedElement.dataset.id === targetParentId) {
      return false;
    }
  }

  return true;
};

watch(
  () => props.selectedId,
  (newId) => {
    // 监听选中状态变化
  }
);

onMounted(() => {
  // 恢复 TreeNodeRegistry 注册
  if (props.node.id) {
    // 注册节点到 TreeNodeRegistry
    TreeNodeRegistry.register(
      props.node.id,
      { isOpen },
      {
        id: props.node.id,
        parentId: props.parentId,
        filePath: props.node.path,
        type: props.node.type
      }
    );
  }
});

onUnmounted(() => {
  // 恢复 TreeNodeRegistry 注销
  if (props.node.id) {
    TreeNodeRegistry.unregister(props.node.id);
  }
});

// Remove findTreeNodeComponent function if it relied on TreeNodeRegistry
// const findTreeNodeComponent = (element: HTMLElement): any => { ... };

// 折叠当前节点
const collapseNode = () => {
  if (hasChildren.value) {
    isOpen.value = false;
  }
};

// 当点击匹配项左侧空白区域时，触发父节点的折叠/展开
const toggleParentFolder = () => {
  if (props.parentId) {
    // 通过TreeNodeRegistry查找父节点
    const parentNodeMetadata = TreeNodeRegistry.getMetadata(props.parentId);
    if (parentNodeMetadata) {
      // 触发父节点的折叠/展开事件
      emit("toggle-node", props.parentId);
    }
  }
};

// Handler for clicking the node row (select or toggle chevron)
const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const iconSpan = target.closest('span[class*="mr-1"]');
  if (!iconSpan) {
    // Click was not on the chevron, select the node
    selectNode();
  }
  // If it was the iconSpan, toggleFolder handles it via @click.stop
};

// 计算当前节点的层级
const nodeLevel = computed(() => props.level || 0);

// 判断是否应该显示计数
const shouldShowCount = computed(() => {
  // 如果是最外层节点（level === 0），则显示
  if (nodeLevel.value === 0) return true;

  // 判断是否为叶子节点的上一级
  // 检查所有子节点，如果至少有一个是match类型，则是叶子节点的上一级
  const hasMatchChild = props.node.children?.some(
    (child) => child.type === "match"
  );

  return hasMatchChild;
});
</script>

<style scoped>
.tree-node {
  margin-bottom: 0; /* 移除底部间距，使节点更紧凑 */
  width: 100%;
  position: relative;
  will-change: transform; /* 启用GPU加速 */
  contain: layout; /* 包含布局变化的影响范围 */
}

.children {
  margin-top: 0; /* 移除顶部间距，使节点更紧凑 */
  width: 100%;
  padding-left: 0; /* 移除整体缩进 */
}

.folder-node,
.file-node,
.group-node,
.match-node {
  width: 100%;
}

/* 为文件和文件夹节点添加区分背景色 */
.file-folder-node {
  background-color: rgba(0, 0, 0, 0.03);
}

.match-node {
  background-color: rgba(79, 79, 79, 0.03);
}

.node-row {
  overflow: visible;
  box-sizing: border-box;
  width: 100%;
  position: relative; /* 确保绝对定位的子元素相对于此元素定位 */
}

/* 新增样式：确保左侧点击区域在最上层 */
.node-row .absolute {
  z-index: 2;
  cursor: pointer;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-handle {
  touch-action: none;
  transition: opacity 0.2s;
}

.drag-handle:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.being-dragged .children,
.sortable-fallback .children,
.sortable-ghost .children {
  display: none !important;
}

:deep(.v-context-menu-content) {
  border-radius: 0 !important;
}
:deep(.v-context-menu-item) {
  border-radius: 0 !important;
}

:deep([data-radix-vue-collection-item]) {
  border-radius: 0px !important;
}
:deep([role="menu"]) {
  border-radius: 0px !important;
}

/* 使用box-shadow提高性能 */
.node-row.context-menu-active:hover {
  background-color: hsl(var(--muted));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

/* 确保节点内容不会溢出 */
.node-row > * {
  position: relative;
  z-index: 1;
}

/* 改进的展开/收起过渡效果 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px; /* 足够大的值以容纳内容 */
  overflow: hidden;
  opacity: 1;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

/* Ensure children div itself doesn't have conflicting transition */
.children {
  /* Remove any potential transition property if added elsewhere */
  /* transition: none; */
  overflow: hidden; /* Important for smooth height transition */
}

.cursor-grab {
  cursor: grab;
}

.drag-item {
  /* Add styles for the item being dragged if needed */
}
.package-node::before {
  content: "";
  display: block;
  width: 100%;
  height: 3px;
  background-image: linear-gradient(to right, #5aceff, #ee38ff);
}
</style>
