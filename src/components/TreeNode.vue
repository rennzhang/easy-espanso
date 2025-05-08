<template>
  <div
    class="tree-node w-full"
    :class="{ 'tree-node-selected': isSelected }"
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
            node.name === 'Packages' ? 'package-node' : node.type + '-node',
          ]"
          @click="handleClick"
          class="cursor-pointer w-full"
        >
          <div
            class="flex items-center w-full py-1.5 group node-row"
            :class="{
              'bg-[linear-gradient(135deg,#4a6c6f,#377f85)] text-white selected':
                (node.type === 'file' || node.type === 'folder') && isSelected,
              'hover:bg-accent hover:text-accent-foreground': !isSelected,
              'bg-card':
                (node.type === 'file' || node.type === 'folder') && !isSelected,
            }"
            :style="{
              paddingLeft: nodeLevel * 20 + 'px',
              '--node-level': nodeLevel,
            }"
          >
            <!-- 添加左侧空白区域点击处理 -->
            <div
              class="absolute left-0 h-full"
              :style="{ width: nodeLevel * 12 + 'px' }"
              @click.stop="toggleFolder"
            ></div>

            <span
              class="mr-1 ml-4 text-muted-foreground cursor-pointer"
              :class="{ 'text-primary-gradient-text': isSelected }"
              @click.stop="toggleFolder"
            >
              <ChevronRightIcon v-if="hasChildren && !isOpen" class="h-4 w-4" />
              <ChevronDownIcon
                v-else-if="hasChildren && isOpen"
                class="h-4 w-4"
              />
              <span v-else class="inline-block" :class="{ 'h-4 w-4': node.type === 'folder' }"></span>
            </span>
            <!-- 文件夹图标放在名称前面 -->
            <span v-if="node.type === 'folder'" class="mr-1.5">
              <VSCodeFolderIcon v-if="!isOpen" class="h-5 w-5 text-primary" />
              <VSCodeFolderOpenIcon v-else class="h-5 w-5 text-primary" />
            </span>
            <!-- 文件图标放在名称前面 -->
            <span v-if="node.type === 'file'" class="mr-1.5">
              <VSCodeYmlIcon class="h-5 w-5 text-muted-foreground" />
            </span>
            <span
              v-if="
                isEditing && (node.type === 'file' || node.type === 'folder')
              "
              class="text-sm font-medium flex-grow"
              @click.stop
            >
              <input
                ref="editNameInput"
                v-model="editingName"
                class="w-full px-1 py-0.5 border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground bg-background"
                @keydown.enter="saveNodeName"
                @blur="saveNodeName"
                @click.stop
              />
            </span>
            <span
              v-else
              class="text-sm font-medium flex-grow cursor-pointer text-foreground"
              :class="{ 'text-white': isSelected }"
              @click.stop="selectNode"
              @dblclick.stop="startEditing"
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
              :class="
                isSelected
                  ? 'bg-primary-gradient-text/20 text-primary-gradient-text'
                  : 'bg-muted text-muted-foreground'
              "
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
              'bg-[linear-gradient(135deg,#2b5876,#4e4376)] text-white selected':
                isSelected,
              'hover:bg-accent hover:text-accent-foreground bg-card': !isSelected,
            }"
            :style="{
              paddingLeft: nodeLevel * 12 + 8 + 'px',
              '--node-level': nodeLevel,
            }"
          >
            <!-- 添加左侧空白区域点击处理 -->
            <div
              class="absolute left-0 h-full"
              :style="{ width: nodeLevel * 12 + 'px' }"
              @click.stop="toggleParentFolder"
            ></div>

            <span class="w-4 inline-block"></span>
            <!-- Indent space -->
            <ZapIcon
              :class="[
                'h-4 w-4 mr-1',
                isSelected ? 'text-white' : 'text-primary',
              ]"
            />
            <span class="text-sm cursor-grab flex-grow text-foreground" :class="{ 'text-white': isSelected }">
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
          'shadow-[inset_0_6px_6px_-6px_hsl(var(--shadow)/0.21),_inset_0_-6px_6px_-6px_hsl(var(--shadow)/0.21)]':
            node.type === 'file',
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
  nextTick,
} from "vue";
import { ChevronRightIcon, ChevronDownIcon, ZapIcon } from "lucide-vue-next";
import VSCodeFolderIcon from "@/components/icons/VSCodeFolderIcon.vue";
import VSCodeFolderOpenIcon from "@/components/icons/VSCodeFolderOpenIcon.vue";
import VSCodeYmlIcon from "@/components/icons/VSCodeYmlIcon.vue";
import type { TreeNodeItem } from "@/components/ConfigTree.vue";
import HighlightText from "@/components/common/HighlightText.vue";
import { VueDraggable } from "vue-draggable-plus";
import NodeContextMenu from "@/components/NodeContextMenu.vue";
import { useEspansoStore } from "@/store/useEspansoStore";
import TreeNodeRegistry from "@/utils/TreeNodeRegistry";
import { toast } from "vue-sonner";
import { isFileNode, isFolderNode } from "@/utils/configTreeUtils";

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

// 编辑相关的状态
const isEditing = ref(false);
const editingName = ref("");
const editNameInput = ref<HTMLInputElement | null>(null);

// Use store's expansion state instead of local state
const isOpen = computed(() => store.isNodeExpanded(props.node.id));

watch(
  () => props.searchQuery,
  (newQuery) => {
    if (newQuery && newQuery.trim() !== "" && !isOpen.value) {
      // If search query is not empty and node is not already open, toggle it
      store.toggleNodeExpansion(props.node.id);
    }
  },
  { immediate: true }
);

const toggleFolder = () => {
  if (props.node.type !== "match" && hasChildren.value) {
    // Use store action instead of local state
    store.toggleNodeExpansion(props.node.id);
    // Still emit event for backward compatibility
    emit("toggle-node", props.node.id);
  }
};

const selectNode = () => {
  // 如果是文件夹类型节点，则不执行选择操作
  if (props.node.type === "folder") {
    // Optionally, toggle the folder instead of selecting
    // toggleFolder();
    return;
  }
  emit("select", props.node);
};

const isSelected = computed(() => {
  return props.node.id === props.selectedId;
});

const displayName = computed(() => {
  if (props.node.type === "file" && props.node.name) {
    // Display name without extension for files
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

    // Check node name for non-match types
    if (nodeType !== "match") {
      return checkMatch(props.node.name, regex);
    }

    // Check match properties for match types
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
        // Check child node name (non-match) or match properties
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

        // Recursively check children if they exist
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
  if (!props.searchQuery?.trim()) return true; // Always visible if no search query
  if (props.parentMatches) return true; // Visible if parent matches
  if (selfMatchesSearch.value) return true; // Visible if self matches
  return descendantMatchesSearch.value; // Visible if any descendant matches
});

// Auto-expand node if it becomes visible due to search results
watch(isVisible, (newValue, oldValue) => {
  if (newValue && !oldValue && props.searchQuery?.trim() && !isOpen.value) {
    // Use store action instead of directly modifying computed property
    store.toggleNodeExpansion(props.node.id);
  }
});

// Cache for visible child count to avoid re-computation
const nodeCountCache = new Map<string, number>();

const visibleChildCount = computed(() => {
  if (!props.node.children) return 0;

  // --- No Search Query ---
  if (!props.searchQuery || props.searchQuery.trim() === "") {
    if (props.node.type === "folder" || props.node.type === "file") {
      const cacheKey = `${props.node.id}-no-search`;
      if (nodeCountCache.has(cacheKey)) {
        return nodeCountCache.get(cacheKey)!;
      }

      let count = 0;
      const countItems = (nodes: TreeNodeItem[]) => {
        for (const node of nodes) {
          if (node.type === "match") {
            count++;
          } else if (node.children && node.children.length > 0) {
            countItems(node.children); // Recursively count in sub-folders/files
          }
        }
      };
      countItems(props.node.children);
      nodeCountCache.set(cacheKey, count);
      return count;
    }
    return 0; // Should not happen for valid parent types
  }

  // --- With Search Query ---
  // Count visible matches within this node's children based on the search query
  const query = props.searchQuery.trim().toLowerCase();
  const cacheKey = `${props.node.id}-search-${query}`;
  if (nodeCountCache.has(cacheKey)) {
    return nodeCountCache.get(cacheKey)!;
  }

  let count = 0;
  const countVisibleMatches = (
    nodes: TreeNodeItem[],
    parentMatchesQuery: boolean
  ) => {
    for (const child of nodes) {
      const childSelfMatches = (() => {
        try {
          const escapedQuery = escapeRegex(query);
          const regex = new RegExp(escapedQuery, "i");
          if (child.type !== "match") {
            return checkMatch(child.name, regex);
          } else if (child.match) {
            const m = child.match;
            return (
              checkMatch(m.trigger, regex) ||
              (Array.isArray(m.triggers) &&
                m.triggers.some((t) => checkMatch(t, regex))) ||
              checkMatch(m.label, regex) ||
              checkMatch(m.description, regex) ||
              checkMatch(m.replace?.toString(), regex)
            );
          }
          return false;
        } catch {
          return false;
        }
      })();

      let childDescendantMatches = false;
      if (child.children && child.children.length > 0) {
        // Simplified check: does *any* descendant match?
        // A more accurate count would require full recursion here, but might be slow.
        // Let's stick to a simpler check for performance.
        // We only need to know if *this* node should display a count,
        // not the exact count of *visible* descendants further down.
        // The current `descendantMatchesSearch` logic handles visibility.
        // Here, we just count direct children that are matches and match the query.
      }

      const childIsVisible =
        parentMatchesQuery || childSelfMatches || childDescendantMatches;

      if (childIsVisible && child.type === "match") {
        count++;
      }

      // Recursively count for folder/file children if they are visible
      if (
        (child.type === "folder" || child.type === "file") &&
        child.children &&
        child.children.length > 0 &&
        childIsVisible
      ) {
        countVisibleMatches(
          child.children,
          childSelfMatches || parentMatchesQuery
        );
      }
    }
  };

  countVisibleMatches(props.node.children, selfMatchesSearch.value);
  nodeCountCache.set(cacheKey, count);
  return count;
});

// Auto-expand if parent matches search (ensures visibility)
watch(
  () => props.parentMatches,
  (newValue) => {
    if (newValue && props.searchQuery?.trim() && !isOpen.value) {
      // Use store action instead of directly modifying computed property
      store.toggleNodeExpansion(props.node.id);
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

  // Prevent emitting events if the item hasn't actually moved between parents or positions
  if (from === to && oldIndex === newIndex) {
    console.log("[TreeNode handleDragEnd] Exiting: No actual move detected.");
    return;
  }

  // Emit 'move' for matches (handled within YAML files)
  if (itemType === "match") {
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
  }
  // Emit 'moveNode' for files and folders (handled as file system operations)
  else if (itemType === "file" || itemType === "folder") {
    console.log(
      `[TreeNode handleDragEnd] Emitting 'moveNode' for ${itemType} with ID ${itemId}`
    );
    const numericNewIndex = typeof newIndex === "number" ? newIndex : 0; // Ensure index is a number
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
  const targetContainer = event.to; // The potential drop target container element

  const draggedNodeType = draggedElement.dataset.nodeType as
    | TreeNodeItem["type"]
    | undefined;
  // The container type is the type of the node *whose children* we are dropping into
  const targetContainerType = targetContainer.dataset.containerType as
    | TreeNodeItem["type"]
    | "root"
    | undefined;
  const targetParentId = targetContainer.dataset.parentId; // ID of the node whose children we are dropping into

  // Basic validation
  if (!draggedNodeType || !targetContainerType) {
    console.warn(
      "[DragMove] Missing node type or container type",
      draggedNodeType,
      targetContainerType
    );
    return false; // Cannot determine validity
  }

  // --- Dragging a Match ---
  if (draggedNodeType === "match") {
    // Can only be dropped into a 'file'
    const allowedContainerTypes: Array<TreeNodeItem["type"] | "root"> = [
      "file",
    ];
    if (!allowedContainerTypes.includes(targetContainerType)) {
      // console.log(`[DragMove] Invalid drop: ${draggedNodeType} cannot be in ${targetContainerType}`);
      return false;
    }
  }
  // --- Dragging a File ---
  else if (draggedNodeType === "file") {
    // Can only be dropped into a 'folder' or the 'root'
    const allowedContainerTypes: Array<TreeNodeItem["type"] | "root"> = [
      "folder",
      "root",
    ];
    if (!allowedContainerTypes.includes(targetContainerType)) {
      // console.log(`[DragMove] Invalid drop: ${draggedNodeType} cannot be in ${targetContainerType}`);
      return false;
    }
  }
  // --- Dragging a Folder ---
  else if (draggedNodeType === "folder") {
    // Can only be dropped into another 'folder' or the 'root'
    const allowedContainerTypes: Array<TreeNodeItem["type"] | "root"> = [
      "folder",
      "root",
    ];
    if (!allowedContainerTypes.includes(targetContainerType)) {
      // console.log(`[DragMove] Invalid drop: ${draggedNodeType} cannot be in ${targetContainerType}`);
      return false;
    }
    // Prevent dropping a folder into itself
    if (draggedElement.dataset.id === targetParentId) {
      // console.log(`[DragMove] Invalid drop: Cannot drop folder into itself`);
      return false;
    }
  }

  // console.log(`[DragMove] Valid drop: ${draggedNodeType} into ${targetContainerType}`);
  return true; // Allow the move
};

onMounted(() => {
  // Register node metadata but not isOpen (now managed by store)
  TreeNodeRegistry.register(
    props.node.id,
    {}, // No longer need to register isOpen ref
    {
      type: props.node.type,
      id: props.node.id,
      parentId: props.parentId,
      filePath: props.node.path,
      // Add other relevant info if needed
    }
  );
});

onUnmounted(() => {
  TreeNodeRegistry.unregister(props.node.id);
});

// 折叠当前节点 (can be called programmatically if needed)
const collapseNode = () => {
  if (hasChildren.value && isOpen.value) {
    // Use store action instead of directly modifying computed property
    store.toggleNodeExpansion(props.node.id);
    emit("toggle-node", props.node.id); // Notify parent if state needs to be synced
  }
};

// 开始编辑节点名称
const startEditing = () => {
  // Only allow editing file and folder names
  if (props.node.type !== "file" && props.node.type !== "folder") {
    return;
  }

  // Prevent renaming the root 'Packages' folder or items directly inside it (convention)
  if (
    props.node.name === "Packages" ||
    (props.node.path &&
      props.node.path.toLowerCase().startsWith("packages/") &&
      props.node.path.split("/").length === 2)
  ) {
    // Allow renaming files/folders *within* subdirectories of Packages
    // Example: 'packages/my_package/config.yml' IS renameable
    // Example: 'packages/my_package' IS renameable
    // Example: 'packages/default.yml' IS NOT renameable (direct child)
    // Example: 'Packages' folder IS NOT renameable
    if (
      props.node.name === "Packages" ||
      (props.node.path &&
        props.node.path.split("/").length <= 2 &&
        props.node.path.toLowerCase().startsWith("packages/"))
    ) {
      // console.log("Renaming root Packages folder or its direct children is disallowed.");
      toast.info("根 'Packages' 文件夹及其直接子项不允许重命名。");
      return;
    }
  }

  isEditing.value = true;
  // Use displayName which removes the extension for files
  editingName.value = displayName.value;

  nextTick(() => {
    if (editNameInput.value) {
      editNameInput.value.focus();
      editNameInput.value.select();
    }
  });
};

// 保存节点名称 - Refactored to use store action
const saveNodeName = async () => {
  if (!isEditing.value) return;

  const originalName = displayName.value; // Name without extension for files
  const newNameTrimmed = editingName.value.trim();

  // Finish editing UI state immediately
  isEditing.value = false;

  // Check if name actually changed
  if (newNameTrimmed === originalName) {
    return;
  }

  // Validate new name
  if (!newNameTrimmed) {
    toast.error("名称不能为空");
    return;
  }
  // Basic validation for invalid characters (adjust regex as needed)
  if (/[\\/:*?"<>|]/.test(newNameTrimmed)) {
    toast.error("名称包含无效字符");
    return;
  }

  // Construct the full new file/folder name (add extension back for files)
  let newFileName = newNameTrimmed;
  if (props.node.type === "file") {
    const match = props.node.name.match(/\.(yml|yaml)$/i);
    const extension = match ? match[0] : ".yml"; // Default to .yml if somehow missing
    newFileName = `${newNameTrimmed}${extension}`;
  }

  try {
    // Call the store action to handle renaming
    console.log(`Attempting to rename node ${props.node.id} to ${newFileName}`);
    await store.renameNode(props.node.id, newFileName);
    toast.success(
      `${props.node.type === "file" ? "文件" : "文件夹"}重命名成功`
    );
    // The store action should handle updating the state and file system
    // No need to manually update node.path, node.name, or call loadConfig here
  } catch (error: any) {
    console.error("重命名失败:", error);
    toast.error(`重命名失败: ${error.message || "未知错误"}`);
    // Optionally revert editingName back to originalName if needed,
    // though the UI state is already updated. The store holds the source of truth.
  }
};

// 当点击匹配项左侧空白区域时，触发父节点的折叠/展开
const toggleParentFolder = () => {
  if (props.parentId) {
    // Emit event for parent component to handle toggling the parent node
    emit("toggle-node", props.parentId);
  }
};

// Handler for clicking the node row (select or toggle chevron)
const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  // Check if the click target or its parent is the chevron icon span
  const iconSpan = target.closest('span[class*="mr-1"]'); // More specific selector if needed

  // Ensure the tree component gets focus for keyboard navigation etc.
  const treeElement = document.querySelector(".config-tree"); // Adjust selector if needed
  if (treeElement && treeElement instanceof HTMLElement) {
    treeElement.focus();
    // console.log('TreeNode点击: 树组件获得焦点');
  }

  if (iconSpan) {
    // Click was on or inside the chevron icon span, toggleFolder handles it via @click.stop
    // console.log("Click on chevron area");
  } else {
    // Click was elsewhere on the node row, select the node (if not a folder)
    // console.log("Click on node content area");
    selectNode();
  }
};

// 计算当前节点的层级
const nodeLevel = computed(() => props.level || 0);

// 判断是否应该显示计数 (Badge with number of matches)
const shouldShowCount = computed(() => {
  // Only show count for Folders, Files, and Groups that actually contain matches
  if (props.node.type === "match") return false; // Matches never show count
  if (!hasChildren.value) return false; // Don't show if no children

  // Show count if it has visible match children (calculated by visibleChildCount)
  return visibleChildCount.value > 0;

  // Alternative simpler logic: Always show for non-match nodes with children?
  // return props.node.type !== 'match' && hasChildren.value;
});

// No longer need to watch isOpen as it's now a computed property
// and changes are handled by the store
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
  background-color: hsl(var(--accent)/5); /* 使用主题强调色，非常淡的背景用于文件子项 */
}

.folder-node,
.file-node,
.match-node {
  width: 100%;
}

/* 为文件和文件夹节点添加区分背景色 */
.file-folder-node {
  background-color: hsl(var(--background)/3); /* 使用主题背景色，带轻微透明度 */
}

.match-node {
  background-color: hsl(var(--secondary)/3); /* 使用主题次要颜色，带轻微透明度 */
}

.node-row {
  overflow: visible; /* Allow context menu etc. */
  box-sizing: border-box;
  width: 100%;
  position: relative; /* 确保绝对定位的子元素相对于此元素定位 */
  transition: background-color 0.1s ease-out, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* 统一过渡效果，添加transform过渡 */
}

/* 选中节点的动态效果 */
.node-row.selected {
  transform: translateX(-4px); /* 选中时向左移动5像素 */
  box-shadow: 4px 0 0 0 hsl(var(--primary)/60%); /* 右侧添加主题色阴影指示 */
  position: relative;
}

/* 添加一个微妙的呼吸效果，让选中状态更加动态 */
.node-row.selected::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 确保不影响点击事件 */
  border-radius: 2px;
  animation: select-pulse 2s infinite ease-in-out;
  opacity: 0.2;
  z-index: 0;
}

@keyframes select-pulse {
  0% {
    box-shadow: inset 0 0 0 1px hsla(var(--primary)/25%);
  }
  50% {
    box-shadow: inset 0 0 0 1px hsla(var(--primary)/5%);
  }
  100% {
    box-shadow: inset 0 0 0 1px hsla(var(--primary)/25%);
  }
}



/* 新增样式：确保左侧点击区域在最上层 */
.node-row .absolute {
  z-index: 2; /* Ensure it's above other elements in the row */
  cursor: pointer;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-handle {
  touch-action: none; /* Prevent scrolling on touch devices when dragging */
  transition: opacity 0.2s;
}

.drag-handle:hover {
  background-color: hsl(var(--muted)/5); /* 使用主题静音色，带轻微透明度 */
  border-radius: 3px;
}

/* Hide children visually during drag operations for cleaner look */
.being-dragged .children,
.sortable-fallback .children,
.sortable-ghost .children {
  display: none !important;
}

/* Context Menu Styling */
:deep(.v-context-menu-content) {
  border-radius: 0 !important;
}
:deep(.v-context-menu-item) {
  border-radius: 0 !important;
}

/* Radix UI Dropdown (used by NodeContextMenu) Styling */
:deep([data-radix-vue-collection-item]) {
  border-radius: 0px !important;
}
:deep([role="menu"]) {
  border-radius: 0px !important;
}

/* Hover effect when context menu is active */
.node-row.context-menu-active:hover {
  background-color: hsl(var(--muted)); /* 使用主题静音颜色 */
  box-shadow: inset 0 0 0 1px hsl(var(--border)/20); /* 使用主题边框色，带透明度 */
}

/* Ensure node content (icons, text) is above the absolute positioned click area */
.node-row > * {
  position: relative;
  z-index: 1;
}

/* Improved expand/collapse transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease-out; /* Faster transition */
  max-height: 1000px; /* Adjust if needed, large enough for content */
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
  overflow: hidden; /* Crucial for smooth height transition */
}

.cursor-grab {
  cursor: grab;
}

.drag-item {
  opacity: 1; /* Default opacity */
}
/* Style for the root 'Packages' node */
.package-node::before {
  content: "";
  display: block;
  width: 100%;
  height: 3px; /* Make the line thicker */
  background-image: linear-gradient(
    to right,
    hsl(var(--primary)), /* 使用主题主色 */
    hsl(var(--secondary)) /* 使用主题次要颜色 */
  );
  /* position: absolute; */
  /* top: 0; */
  /* left: 0; */
}
</style>
