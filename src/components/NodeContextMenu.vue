<template>
  <ContextMenu @update:open="handleContextMenuUpdate">
    <ContextMenuTrigger>
      <div :class="{
        'outline outline-2 outline-offset-[-2px] outline-blue-700': isContextMenuOpen && !props.isSelected,
        'outline outline-2 outline-offset-[-2px] outline-blue-300': isContextMenuOpen && props.isSelected
      }" class="w-full">
        <slot></slot>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent class="w-48 !rounded-none">
      <!-- Dynamically render menu items -->
      <template v-for="(item, index) in computedMenuItems" :key="index">
        <ContextMenuItem 
          v-if="item.show !== false" 
          @select="item.action" 
          :disabled="item.disabled"
          :variant="item.variant"
        >
          <component v-if="item.icon" :is="item.icon" class="mr-2 h-4 w-4" />
          {{ item.label }}
        </ContextMenuItem>
        <ContextMenuSeparator v-if="item.separator && item.show !== false && computedMenuItems[index+1]?.show !== false" />
      </template>
    </ContextMenuContent>
  </ContextMenu>

  <!-- 确认对话框 -->
  <ConfirmDialog 
    v-model:visible="confirmDialogVisible"
    :title="confirmDialogTitle"
    :message="confirmDialogMessage"
    @confirm="handleConfirmDelete"
    @cancel="confirmDialogVisible = false"
  />
</template>

<script setup lang="ts">
import {
  PlusIcon, Trash2Icon, ClipboardCopyIcon, ScissorsIcon, ClipboardPasteIcon,
  MinimizeIcon, MaximizeIcon, PencilIcon, ChevronsUpDownIcon
} from "lucide-vue-next";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator
} from '@/components/ui/context-menu';
import { useContextMenu } from '@/composables/useContextMenu';
import { ref, defineProps, defineEmits, computed, Component } from "vue";
import ClipboardManager from '@/utils/ClipboardManager';
import type { TreeNodeItem } from "./ConfigTree.vue";
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

// --- MenuItem Interface --- 
interface MenuItem {
  label: string;
  icon?: Component;
  action?: () => void;
  separator?: boolean; // Indicates if a separator should follow this item
  disabled?: boolean;
  variant?: 'destructive';
  show?: boolean; // Controls visibility, defaults to true
}

// --- Props and Emits --- 
const props = defineProps<{
  node: TreeNodeItem;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  (e: "request-rename", item: TreeNodeItem): void;
  (e: "move", payload: { itemId: string; oldParentId: string | null; newParentId: string | null; oldIndex: number; newIndex: number }): void;
}>();

const isContextMenuOpen = ref(false);

// 使用共享的上下文菜单逻辑
const {
  confirmDialogVisible,
  confirmDialogTitle,
  confirmDialogMessage,
  nodeHasChildren,
  handleCopyNodeName,
  handleCopyItem,
  handleCutItem,
  handlePasteItem,
  handleCreateMatch,
  handleCreateGroup,
  handleExpandAll,
  handleCollapseAll,
  handleExpandCurrentNode,
  handleCollapseCurrentNode,
  prepareDeleteMatch,
  prepareDeleteGroup,
  handleConfirmDelete
} = useContextMenu(props);

const handleContextMenuUpdate = (open: boolean) => {
  isContextMenuOpen.value = open;
};

const handleRequestRename = () => {
  emit('request-rename', props.node);
};

// --- Computed Properties --- 
// 判断剪贴板是否有内容
const canPaste = computed(() => ClipboardManager.hasItem());

// --- Computed Menu Items --- 
const computedMenuItems = computed((): MenuItem[] => {
  const type = props.node.type;
  let items: MenuItem[] = [];

  // --- Common Items (Top) ---
  items.push(
    { label: '新建片段', icon: PlusIcon, action: handleCreateMatch },
    { label: '新建分组', icon: PlusIcon, action: handleCreateGroup, separator: true }
  );

  // --- Type-Specific Items ---
  if (type === 'group') {
    items.push(
      { label: '重命名分组', icon: PencilIcon, action: handleRequestRename },
      { label: '复制名称', icon: ClipboardCopyIcon, action: handleCopyNodeName },
      { label: '复制分组', icon: ClipboardCopyIcon, action: handleCopyItem },
      { label: '剪切分组', icon: ScissorsIcon, action: handleCutItem, separator: true },
      { label: '粘贴', icon: ClipboardPasteIcon, action: handlePasteItem, disabled: !canPaste.value, separator: true },
      { label: '删除分组', icon: Trash2Icon, action: prepareDeleteGroup, variant: 'destructive' }
    );
  } else if (type === 'file') {
     items.push(
       { label: '重命名文件', icon: PencilIcon, action: handleRequestRename },
       { label: '复制名称', icon: ClipboardCopyIcon, action: handleCopyNodeName, separator: true },
       { label: '粘贴', icon: ClipboardPasteIcon, action: handlePasteItem, disabled: !canPaste.value, separator: true },
       { label: '展开当前', icon: MaximizeIcon, action: handleExpandCurrentNode, disabled: !nodeHasChildren() },
       { label: '收起当前', icon: MinimizeIcon, action: handleCollapseCurrentNode, disabled: !nodeHasChildren() },
       { label: '展开全部', icon: ChevronsUpDownIcon, action: handleExpandAll },
       { label: '收起全部', icon: ChevronsUpDownIcon, action: handleCollapseAll }
     );
  } else if (type === 'folder') {
     items.push(
       { label: '重命名文件夹', icon: PencilIcon, action: handleRequestRename },
       { label: '复制名称', icon: ClipboardCopyIcon, action: handleCopyNodeName, separator: true },
       { label: '粘贴', icon: ClipboardPasteIcon, action: handlePasteItem, disabled: !canPaste.value, separator: true },
       { label: '展开当前', icon: MaximizeIcon, action: handleExpandCurrentNode, disabled: !nodeHasChildren() },
       { label: '收起当前', icon: MinimizeIcon, action: handleCollapseCurrentNode, disabled: !nodeHasChildren() },
       { label: '展开全部', icon: ChevronsUpDownIcon, action: handleExpandAll },
       { label: '收起全部', icon: ChevronsUpDownIcon, action: handleCollapseAll }
     );
  } else if (type === 'match') {
     items.push(
       { label: '复制片段', icon: ClipboardCopyIcon, action: handleCopyItem },
       { label: '剪切片段', icon: ScissorsIcon, action: handleCutItem, separator: true },
       { label: '粘贴 (同级)', icon: ClipboardPasteIcon, action: handlePasteItem, disabled: !canPaste.value, separator: true },
       { label: '删除片段', icon: Trash2Icon, action: prepareDeleteMatch, variant: 'destructive' }
     );
  }

  return items;
});
</script>

<style scoped>
</style>
