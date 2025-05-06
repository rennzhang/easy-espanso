<template>
  <ContextMenu @update:open="handleContextMenuUpdate">
    <ContextMenuTrigger>
      <div
        :class="{
          /* 'outline outline-2 outline-offset-[-2px] outline-blue-700': isContextMenuOpen && !props.isSelected, */
          /* 'outline outline-2 outline-offset-[-2px] outline-blue-300': isContextMenuOpen && props.isSelected, */
          'outline outline-2 outline-offset-[-2px] outline-ring': isContextMenuOpen && !props.isSelected, /* Use theme ring color */
          'outline outline-2 outline-offset-[-2px] outline-primary/50': isContextMenuOpen && props.isSelected, /* Use lighter primary for selected */
        }"
        class="w-full"
      >
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
          <ContextMenuShortcut v-if="item.shortcut">{{
            item.shortcut
          }}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator
          v-if="
            item.separator &&
            item.show !== false &&
            computedMenuItems[index + 1]?.show !== false
          "
        />
      </template>
    </ContextMenuContent>
  </ContextMenu>

  <!-- 不再需要确认对话框 -->
</template>

<script setup lang="ts">
import {
  PlusIcon,
  Trash2Icon,
  ClipboardCopyIcon,
  ScissorsIcon,
  ClipboardPasteIcon,
  PencilIcon,
  ChevronsUpDownIcon,
  ExternalLinkIcon,
  FileIcon,
} from "lucide-vue-next";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { useContextMenu } from "@/hooks/useContextMenu";
import { ref, defineProps, defineEmits, computed } from "vue";
import ClipboardManager from "@/utils/ClipboardManager";
import type { TreeNodeItem } from "./ConfigTree.vue";
import { useI18n } from "vue-i18n";


// --- MenuItem Interface ---
interface MenuItem {
  label: string;
  icon?: any;
  action?: () => void;
  separator?: boolean; // Indicates if a separator should follow this item
  disabled?: boolean;
  variant?: "destructive";
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
}>();

const isContextMenuOpen = ref(false);

// 使用共享的上下文菜单逻辑
const {
  handleCopyNodePath,
  handleCopyItem,
  handleCutItem,
  handlePasteItem,
  handleCreateMatch,
  handleCreateConfigFile,
  handleExpandAll,
  handleCollapseAll,
  prepareDeleteMatch,
  prepareDeleteFile,
  prepareDeleteFolder,
  canPaste,
} = useContextMenu({
  getNode: () => props.node,
});

const handleContextMenuUpdate = (open: boolean) => {
  isContextMenuOpen.value = open;
};

const handleRequestRename = () => {
  emit("request-rename", props.node);
};

// 打开 Espanso 官方包网站
const handleOpenPackageHub = async () => {
  window.open("https://hub.espanso.org/", "_blank");
};

// --- Computed Properties ---
// Helper to get Cmd or Ctrl symbol based on platform
const getPlatformKey = (): string => {
  if (typeof navigator !== "undefined") {
    if (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
      return "⌘"; // Command symbol for macOS
    }
  }
  return "Ctrl"; // Control symbol for Windows/Linux etc.
};
const platformKey = getPlatformKey(); // Get the key once

// 获取删除快捷键提示
const getDeleteShortcut = (): string => {
  if (typeof navigator !== "undefined") {
    if (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
      return "⌘+Del"; // macOS 删除快捷键
    } else {
      return "Del/Bksp"; // Windows/Linux 删除快捷键
    }
  }
  return "Delete"; // Windows/Linux 删除快捷键
};
const deleteShortcut = getDeleteShortcut(); // Get the key once

// --- Computed Menu Items ---
const computedMenuItems = computed((): MenuItem[] => {
  const type = props.node.type;
  let items: MenuItem[] = [];

  const t = useI18n().t;

  // --- Common Items (Top) ---
  items.push({
    label: t('contextMenu.newSnippet'),
    icon: PlusIcon,
    action: handleCreateMatch,
    separator: true,
  });

  // 检查是否是 Packages 相关节点
  const isPackageNode = props.node.name === "Packages" ||
                        (props.node.path && props.node.path.includes("/packages/")) ||
                        (props.node.path && props.node.path.includes("packages/"));

  // 只在 Packages 根节点时移除"新建片段"菜单项
  if (props.node.name === "Packages") {
    // 移除"新建片段"菜单项
    items.pop();
  }

  // 只在文件夹类型下且不是 Packages 相关节点时添加"新建配置文件"菜单项
  if (type === "folder" && !isPackageNode) {
    items.push({
      label: t('contextMenu.newConfigFile'),
      icon: FileIcon,
      action: handleCreateConfigFile,
      separator: true,
    });
  }

  // --- Paste (仅在非文件夹类型节点可用) ---
  if (type !== "folder") {
    items.push({
      label: t('contextMenu.paste'),
      icon: ClipboardPasteIcon,
      action: handlePasteItem,
      disabled: !canPaste.value,
      shortcut: `${platformKey}+V`,
      separator: true,
    });
  }

  if (type === "file") {
    // 文件类型的菜单项
    if (isPackageNode) {
      // Packages 相关节点的文件菜单项
      items.push(
        {
          label: t('contextMenu.copyPath'),
          icon: ClipboardCopyIcon,
          action: handleCopyNodePath,
          separator: true,
        },
        { label: t('contextMenu.expandAll'), icon: ChevronsUpDownIcon, action: handleExpandAll },
        {
          label: t('contextMenu.collapseAll'),
          icon: ChevronsUpDownIcon,
          action: handleCollapseAll,
          separator: true,
        },
        {
          label: t('contextMenu.browseOfficialPackages'),
          icon: ExternalLinkIcon,
          action: handleOpenPackageHub,
          separator: true,
        }
      );
    } else {
      // 普通文件的菜单项
      items.push(
        { label: t('contextMenu.renameFile'), icon: PencilIcon, action: handleRequestRename },
        {
          label: t('contextMenu.copyPath'),
          icon: ClipboardCopyIcon,
          action: handleCopyNodePath,
          separator: true,
        },
        { label: t('contextMenu.expandAll'), icon: ChevronsUpDownIcon, action: handleExpandAll },
        {
          label: t('contextMenu.collapseAll'),
          icon: ChevronsUpDownIcon,
          action: handleCollapseAll,
          separator: true,
        },
        {
          label: t('contextMenu.deleteFile'),
          icon: Trash2Icon,
          action: prepareDeleteFile,
          variant: "destructive",
          shortcut: deleteShortcut,
        }
      );
    }
  } else if (type === "folder") {
    // 文件夹类型的菜单项
    if (isPackageNode) {
      // Packages 相关节点的菜单项
      items.push(
        {
          label: t('contextMenu.copyPath'),
          icon: ClipboardCopyIcon,
          action: handleCopyNodePath,
          separator: true,
        },
        { label: t('contextMenu.expandAll'), icon: ChevronsUpDownIcon, action: handleExpandAll },
        {
          label: t('contextMenu.collapseAll'),
          icon: ChevronsUpDownIcon,
          action: handleCollapseAll,
          separator: true,
        },
        {
          label: t('contextMenu.browseOfficialPackages'),
          icon: ExternalLinkIcon,
          action: handleOpenPackageHub,
          separator: true,
        }
      );

      // 只有不是根 Packages 文件夹时才显示卸载选项
      if (props.node.name !== "Packages") {
        items.push({
          label: t('contextMenu.uninstallPackage'),
          icon: Trash2Icon,
          action: prepareDeleteFolder,
          variant: "destructive",
          shortcut: deleteShortcut,
        });
      }
    } else {
      // 普通文件夹的菜单项
      items.push(
        { label: t('contextMenu.renameFolder'), icon: PencilIcon, action: handleRequestRename },
        {
          label: t('contextMenu.copyPath'),
          icon: ClipboardCopyIcon,
          action: handleCopyNodePath,
          separator: true,
        },
        { label: t('contextMenu.expandAll'), icon: ChevronsUpDownIcon, action: handleExpandAll },
        {
          label: t('contextMenu.collapseAll'),
          icon: ChevronsUpDownIcon,
          action: handleCollapseAll,
          separator: true,
        },
        {
          label: t('contextMenu.deleteFolder'),
          icon: Trash2Icon,
          action: prepareDeleteFolder,
          variant: "destructive",
          shortcut: deleteShortcut,
        }
      );
    }
  } else if (type === "match") {
    // 片段类型的菜单项
    if (isPackageNode) {
      // Packages 相关节点的片段菜单项
      items.push(
        {
          label: t('contextMenu.copyPath'),
          icon: ClipboardCopyIcon,
          action: handleCopyNodePath,
        },
        {
          label: t('contextMenu.copySnippet'),
          icon: ClipboardCopyIcon,
          action: handleCopyItem,
          shortcut: `${platformKey}+C`,
        },
      );
    } else {
      // 普通片段的菜单项
      items.push(
        {
          label: t('contextMenu.copyPath'),
          icon: ClipboardCopyIcon,
          action: handleCopyNodePath,
        },
        {
          label: t('contextMenu.copySnippet'),
          icon: ClipboardCopyIcon,
          action: handleCopyItem,
          shortcut: `${platformKey}+C`,
        },
        {
          label: t('contextMenu.cutSnippet'),
          icon: ScissorsIcon,
          action: handleCutItem,
          shortcut: `${platformKey}+X`,
          separator: true,
        },
        {
          label: t('contextMenu.deleteSnippet'),
          icon: Trash2Icon,
          action: prepareDeleteMatch,
          variant: "destructive",
          shortcut: deleteShortcut,
        }
      );
    }
  }

  return items;
});
</script>

<style scoped></style>
