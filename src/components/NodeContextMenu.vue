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
          <span>{{ item.label }}</span>
          <ContextMenuShortcut v-if="item.shortcut">{{ item.shortcut }}</ContextMenuShortcut>
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
  PencilIcon, ChevronsUpDownIcon, ExternalLinkIcon, FileIcon
} from "lucide-vue-next";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
  ContextMenuShortcut
} from '@/components/ui/context-menu';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ref, defineProps, defineEmits, computed } from "vue";
import ClipboardManager from '@/utils/ClipboardManager';
import type { TreeNodeItem } from "./ConfigTree.vue";
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

// --- MenuItem Interface ---
interface MenuItem {
  label: string;
  icon?: any;
  action?: () => void;
  separator?: boolean; // Indicates if a separator should follow this item
  disabled?: boolean;
  variant?: 'destructive';
  show?: boolean; // Controls visibility, defaults to true
  shortcut?: string; // <-- Add shortcut property
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
  handleCopyNodeName,
  handleCopyNodePath,
  handleCopyItem,
  handleCutItem,
  handlePasteItem,
  handleCreateMatch,
  handleCreateConfigFile,
  handleExpandAll,
  handleCollapseAll,
  prepareDeleteMatch,
  prepareDeleteGroup,
  handleConfirmDelete
} = useContextMenu({
  getNode: () => props.node
});

const handleContextMenuUpdate = (open: boolean) => {
  isContextMenuOpen.value = open;
};

const handleRequestRename = () => {
  emit('request-rename', props.node);
};

// 打开 Espanso 官方包网站
const handleOpenPackageHub = async () => {
  window.open('https://hub.espanso.org/', '_blank');
};

// --- Computed Properties ---
// 判断剪贴板是否有内容
const canPaste = computed(() => ClipboardManager.hasItem());

// Helper to get Cmd or Ctrl symbol based on platform
const getPlatformKey = (): string => {
  if (typeof navigator !== 'undefined') {
    if (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
      return '⌘'; // Command symbol for macOS
    }
  }
  return 'Ctrl'; // Control symbol for Windows/Linux etc.
};
const platformKey = getPlatformKey(); // Get the key once

// 获取删除快捷键提示
const getDeleteShortcut = (): string => {
  if (typeof navigator !== 'undefined') {
    if (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
      return '⌘+Del'; // macOS 删除快捷键
    } else {
      return 'Del/Bksp'; // Windows/Linux 删除快捷键
    }
  }
  return 'Delete'; // Windows/Linux 删除快捷键
};
const deleteShortcut = getDeleteShortcut(); // Get the key once

// --- Computed Menu Items ---
const computedMenuItems = computed((): MenuItem[] => {
  const type = props.node.type;
  let items: MenuItem[] = [];

  // --- Common Items (Top) ---
  items.push(
    { label: '新建片段', icon: PlusIcon, action: handleCreateMatch, separator: true }
  );

  // 只在文件夹类型下添加"新建配置文件"菜单项
  if (type === 'folder') {
    items.push(
      { label: '新建配置文件', icon: FileIcon, action: handleCreateConfigFile, separator: true }
    );
  }

  // --- Paste (Always available if clipboard has content) ---
  items.push(
    { label: '粘贴', icon: ClipboardPasteIcon, action: handlePasteItem, disabled: !canPaste.value, shortcut: `${platformKey}+V`, separator: true } // Updated shortcut format
  );

  // --- Type-Specific Items ---
  if (type === 'group') {
    items.push(
      { label: '重命名分组', icon: PencilIcon, action: handleRequestRename },
      { label: '复制名称', icon: ClipboardCopyIcon, action: handleCopyNodeName },
      { label: '复制路径', icon: ClipboardCopyIcon, action: handleCopyNodePath },
      { label: '复制分组', icon: ClipboardCopyIcon, action: handleCopyItem, shortcut: `${platformKey}+C` }, // Updated shortcut format
      { label: '剪切分组', icon: ScissorsIcon, action: handleCutItem, shortcut: `${platformKey}+X`, separator: true }, // Updated shortcut format
      { label: '删除分组', icon: Trash2Icon, action: prepareDeleteGroup, variant: 'destructive', shortcut: deleteShortcut } // 使用平台特定的删除快捷键
    );
  } else if (type === 'file' || type === 'folder') { // Combine File/Folder items where possible
     const nodeTypeName = type === 'file' ? '文件' : '文件夹';

     // 基本菜单项
     const baseItems = [
       { label: `重命名${nodeTypeName}`, icon: PencilIcon, action: handleRequestRename },
       { label: '复制名称', icon: ClipboardCopyIcon, action: handleCopyNodeName },
       { label: '复制路径', icon: ClipboardCopyIcon, action: handleCopyNodePath, separator: true },
       { label: '展开全部', icon: ChevronsUpDownIcon, action: handleExpandAll },
       { label: '收起全部', icon: ChevronsUpDownIcon, action: handleCollapseAll }
     ];

     // 如果是 Packages 相关节点，添加打开官方包网站的选项
     if (props.node.name === 'Packages' || (props.node.path && props.node.path.includes('/packages/'))) {
       baseItems.push(
         { label: '浏览官方包库', icon: ExternalLinkIcon, action: handleOpenPackageHub, separator: true }
       );
     }

     items.push(...baseItems);
  } else if (type === 'match') {
     items.push(
       { label: '复制名称', icon: ClipboardCopyIcon, action: handleCopyNodeName },
       { label: '复制路径', icon: ClipboardCopyIcon, action: handleCopyNodePath },
       { label: '复制片段', icon: ClipboardCopyIcon, action: handleCopyItem, shortcut: `${platformKey}+C` }, // Updated shortcut format
       { label: '剪切片段', icon: ScissorsIcon, action: handleCutItem, shortcut: `${platformKey}+X`, separator: true }, // Updated shortcut format
       { label: '删除片段', icon: Trash2Icon, action: prepareDeleteMatch, variant: 'destructive', shortcut: deleteShortcut } // 使用平台特定的删除快捷键
     );
  }

  return items;
});
</script>

<style scoped>
</style>
