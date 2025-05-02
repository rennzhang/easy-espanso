<template>
  <ContextMenu @update:open="handleContextMenuUpdate">
    <ContextMenuTrigger>
      <div :class="{
        'box-shadow-inset': isContextMenuOpen && !props.isSelected,
        'box-shadow-inset-white': isContextMenuOpen && props.isSelected
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
  MinimizeIcon, MaximizeIcon, FolderIcon, FolderOpenIcon, PencilIcon, ChevronsUpDownIcon
} from "lucide-vue-next";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator
} from '@/components/ui/context-menu';
import { useEspansoStore } from '@/store/useEspansoStore';
import { toast } from 'vue-sonner';
import ClipboardManager from '@/utils/ClipboardManager';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry';
import type { TreeNodeItem } from "./ConfigTree.vue";
import type { Match, Group } from "@/types/espanso";
import { ref, defineProps, defineEmits, computed, Component } from "vue";

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
}>();

const emit = defineEmits<{
  (e: "request-rename", item: TreeNodeItem): void;
  (e: "move", payload: { itemId: string; oldParentId: string | null; newParentId: string | null; oldIndex: number; newIndex: number }): void;
}>();

const store = useEspansoStore();

// --- State --- 
const isContextMenuOpen = ref(false);
const handleContextMenuUpdate = (open: boolean) => {
  isContextMenuOpen.value = open;
};

// --- Computed Properties --- 

// Helper to check if node has children
const nodeHasChildren = computed(() => {
  if (props.node.type === 'file' || props.node.type === 'folder') {
      // For file/folder, check the children array in the TreeNodeItem structure
      return props.node.children && props.node.children.length > 0;
  } else if (props.node.type === 'group') { // Espanso group
     // Espanso groups contain matches/groups, check those from the original group data
     return (props.node.group?.matches && props.node.group.matches.length > 0) || 
            (props.node.group?.groups && props.node.group.groups.length > 0);
  }
  return false;
});

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
      // Keep Expand/Collapse for Espanso groups if they should control the containing file/folder state? 
      // Or remove them if only File/Folder nodes should have this? Assuming remove for now.
      // { label: '展开当前', icon: MaximizeIcon, action: handleExpandCurrentNode, disabled: !nodeHasChildren.value },
      // { label: '收起当前', icon: MinimizeIcon, action: handleCollapseCurrentNode, disabled: !nodeHasChildren.value },
      // { label: '展开全部', icon: ChevronsUpDownIcon, action: handleExpandAll },
      // { label: '收起全部', icon: ChevronsUpDownIcon, action: handleCollapseAll, separator: true }, 
      { label: '删除分组', icon: Trash2Icon, action: handleDeleteGroup, variant: 'destructive' }
    );
  } else if (type === 'file') {
     items.push(
       { label: '重命名文件', icon: PencilIcon, action: handleRequestRename },
       { label: '复制名称', icon: ClipboardCopyIcon, action: handleCopyNodeName, separator: true },
       { label: '粘贴', icon: ClipboardPasteIcon, action: handlePasteItem, disabled: !canPaste.value, separator: true },
       { label: '展开当前', icon: MaximizeIcon, action: handleExpandCurrentNode, disabled: !nodeHasChildren.value },
       { label: '收起当前', icon: MinimizeIcon, action: handleCollapseCurrentNode, disabled: !nodeHasChildren.value },
       { label: '展开全部', icon: ChevronsUpDownIcon, action: handleExpandAll }, // Icon needs adjustment
       { label: '收起全部', icon: ChevronsUpDownIcon, action: handleCollapseAll }  // Icon needs adjustment
     );
  } else if (type === 'folder') {
     items.push(
       { label: '重命名文件夹', icon: PencilIcon, action: handleRequestRename },
       { label: '复制名称', icon: ClipboardCopyIcon, action: handleCopyNodeName, separator: true },
       { label: '粘贴', icon: ClipboardPasteIcon, action: handlePasteItem, disabled: !canPaste.value, separator: true },
       { label: '展开当前', icon: MaximizeIcon, action: handleExpandCurrentNode, disabled: !nodeHasChildren.value },
       { label: '收起当前', icon: MinimizeIcon, action: handleCollapseCurrentNode, disabled: !nodeHasChildren.value },
       { label: '展开全部', icon: ChevronsUpDownIcon, action: handleExpandAll }, // Icon needs adjustment
       { label: '收起全部', icon: ChevronsUpDownIcon, action: handleCollapseAll } // Icon needs adjustment
     );
  } else if (type === 'match') {
     items.push(
       // No rename for matches
       { label: '复制片段', icon: ClipboardCopyIcon, action: handleCopyItem },
       { label: '剪切片段', icon: ScissorsIcon, action: handleCutItem, separator: true },
       { label: '粘贴 (同级)', icon: ClipboardPasteIcon, action: handlePasteItem, disabled: !canPaste.value, separator: true },
       { label: '删除片段', icon: Trash2Icon, action: handleDeleteMatch, variant: 'destructive' }
     );
  }

  // Filter out items where show is explicitly false (if we add that later)
  // return items.filter(item => item.show !== false);
  return items;
});

// --- Handler Functions (Keep all, ensure they handle context correctly) ---

const handleRequestRename = () => {
  emit('request-rename', props.node);
};

const handleCopyNodeName = async () => {
  if (!props.node.name) return;
  if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(props.node.name);
        toast.success('名称已复制到剪贴板');
      } catch (err) {
        console.error('Failed to copy node name:', err);
        toast.error('无法复制名称');
      }
  } else {
        toast.error('剪贴板不可用');
  }
};

const handleCopyItem = () => {
  if (props.node.type === 'match' && props.node.match) {
     ClipboardManager.copyItem(props.node.match);
     toast.success('片段已复制', { description: props.node.name });
  } else if (props.node.type === 'group' && props.node.group) {
     ClipboardManager.copyItem(props.node.group);
     toast.success('分组已复制', { description: props.node.name });
  }
};

const handleCutItem = () => {
   if (props.node.type === 'match' && props.node.match) {
      ClipboardManager.cutItem(props.node.match); 
      toast.success('片段已剪切', { description: props.node.name });
      // Let paste handle the actual move/delete
   } else if (props.node.type === 'group' && props.node.group) {
      ClipboardManager.cutItem(props.node.group); 
      toast.success('分组已剪切', { description: props.node.name });
      // Let paste handle the actual move/delete
   }
};

const handlePasteItem = () => {
   const { item: clipboardItem, operation } = ClipboardManager.getItem();

   if (!clipboardItem) {
       toast.error('粘贴失败: 剪贴板为空');
       return;
   }

   let targetParentId: string | null = null;
   let targetFilePath: string | null = null;

   if (props.node.type === 'folder' || props.node.type === 'file' || props.node.type === 'group') {
       targetParentId = props.node.id;
   } else if (props.node.type === 'match') {
       const metadata = TreeNodeRegistry.getMetadata(props.node.id);
       targetParentId = metadata?.parentId || null;
       console.warn("Pasting relative to a match - parent determination might be incomplete.");
   }

   console.log(`Pasting item ${clipboardItem.id} (${clipboardItem.type}) into parent ${targetParentId || 'root?'}`);

   emit('move', {
       itemId: clipboardItem.id,
       oldParentId: operation === 'cut' ? 'clipboard' : null,
       newParentId: targetParentId,
       oldIndex: -1, 
       newIndex: 0,
   });

   toast.success(`粘贴成功: ${clipboardItem.name}`);
   if (operation === 'cut') { 
      ClipboardManager.clear();
   } 
};

const handleCreateMatch = () => {
  let parentId: string | null = null;
  let targetFilePath: string | undefined = undefined;

  if (props.node.type === 'folder' || props.node.type === 'file' || props.node.type === 'group') {
      parentId = props.node.id;
      targetFilePath = (props.node.type === 'file' || props.node.type === 'folder') ? props.node.path : props.node.group?.filePath;
  } else if (props.node.type === 'match') {
       const metadata = TreeNodeRegistry.getMetadata(props.node.id);
       parentId = metadata?.parentId || null;
       if (parentId) {
           const parentMetadata = TreeNodeRegistry.getMetadata(parentId);
           targetFilePath = parentMetadata?.filePath;
       }
  }

  if (targetFilePath === undefined) {
      targetFilePath = store.state.config?.path || 'config/default.yml';
      console.warn(`[NodeContextMenu] Could not determine target file path for new match, using default: ${targetFilePath}`);
  }

  const newMatch: Match = {
    id: `match-${Date.now()}`,
    type: 'match', trigger: ':new', replace: '新片段', 
    filePath: targetFilePath
  };
  store.addItem(newMatch);
  toast.success('新片段已创建');
};

const handleCreateGroup = () => {
  let parentId: string | null = null;
  let targetFilePath: string | undefined = undefined;

  if (props.node.type === 'folder' || props.node.type === 'file' || props.node.type === 'group') {
      parentId = props.node.id;
      targetFilePath = (props.node.type === 'file' || props.node.type === 'folder') ? props.node.path : props.node.group?.filePath;
  } else if (props.node.type === 'match') {
      const metadata = TreeNodeRegistry.getMetadata(props.node.id);
      parentId = metadata?.parentId || null;
       if (parentId) {
           const parentMetadata = TreeNodeRegistry.getMetadata(parentId);
           targetFilePath = parentMetadata?.filePath;
       }
  }

  if (targetFilePath === undefined) {
      targetFilePath = store.state.config?.path || 'config/default.yml';
      console.warn(`[NodeContextMenu] Could not determine target file path for new group, using default: ${targetFilePath}`);
  }

  const newGroup: Group = {
    id: `group-${Date.now()}`,
    type: 'group', name: '新分组', matches: [], groups: [], 
    filePath: targetFilePath
  };
  store.addItem(newGroup);
  toast.success('新分组已创建');
};

const handleDeleteMatch = () => {
  if (props.node.type === 'match' && props.node.match?.id) {
    if (confirm(`确定要删除片段 \"${props.node.name}\" 吗？`)) {
      store.deleteItem(props.node.match.id, 'match');
      toast.success('片段已删除');
    }
  }
};

const handleDeleteGroup = () => {
  if (props.node.type === 'group' && props.node.group?.id) {
     if (confirm(`确定要删除分组 \"${props.node.name}\" 及其所有内容吗？`)) {
       store.deleteItem(props.node.group.id, 'group');
       toast.success('分组已删除');
     }
  }
};

const handleExpandAll = () => {
  console.log('[NodeContextMenu] Expanding all...');
  TreeNodeRegistry.expandAll();
  toast.success('已展开所有节点');
};

const handleCollapseAll = () => {
  console.log('[NodeContextMenu] Collapsing all...');
  TreeNodeRegistry.collapseAll();
  toast.success('已收起所有节点');
};

const handleExpandCurrentNode = () => {
  if (!nodeHasChildren.value) return;
  console.log(`[NodeContextMenu] Expanding current node: ${props.node.id}`);
  TreeNodeRegistry.expandNodeAndChildren(props.node.id);
};

const handleCollapseCurrentNode = () => {
  if (!nodeHasChildren.value) return;
  console.log(`[NodeContextMenu] Collapsing current node: ${props.node.id}`);
  TreeNodeRegistry.collapseNodeAndChildren(props.node.id);
};

// 确认删除后的处理
const handleConfirmDelete = async () => {
  if (!pendingDeleteId.value || !pendingDeleteType.value) return;

  const type = pendingDeleteType.value;
  const id = pendingDeleteId.value;
  
  try {
    if (type === 'match' || type === 'group') {
      // 删除匹配项或分组 - 这部分保持不变
      store.deleteItem(id, type);
      toast.success(`${type === 'match' ? '片段' : '分组'}已删除`);
    } else if (type === 'file' || type === 'folder') {
      // 获取文件或文件夹的路径
      const node = props.node.type === type ? props.node : null;
      if (!node || !node.path) {
        toast.error(`无法删除${type === 'file' ? '文件' : '文件夹'}: 找不到路径`);
        return;
      }
      
      const filePath = node.path;
      console.log(`尝试删除文件系统中的${type}: ${filePath}`);

      // 先从树结构中移除节点
      if (store.moveTreeNode) {
        store.moveTreeNode(id, null, -1);
      }
      
      // 然后通过preloadApi删除实际文件
      if (window.preloadApi) {
        try {
          let deletionSuccessful = false;
          
          if (type === 'file') {
            // 删除文件 - 使用类型断言解决类型检查问题
            const api = window.preloadApi as any;
            if (api.deleteFile) {
              await api.deleteFile(filePath);
              deletionSuccessful = true;
              toast.success('文件已删除');
            } else {
              console.error('preloadApi.deleteFile 不可用');
              toast.error('删除文件功能不可用');
            }
          } else if (type === 'folder') {
            // 删除文件夹 - 使用类型断言解决类型检查问题
            const api = window.preloadApi as any;
            if (api.removeDirectory) {
              await api.removeDirectory(filePath);
              deletionSuccessful = true;
              toast.success('文件夹已删除');
            } else {
              console.error('preloadApi.removeDirectory 不可用');
              toast.error('删除文件夹功能不可用');
            }
          }
          
          // 如果删除成功，重新加载配置或触发界面刷新
          if (deletionSuccessful) {
            // 尝试获取当前加载的配置根目录
            const configRootDir = store.state.configRootDir;
            if (configRootDir) {
              // 重新加载整个配置树以刷新UI
              await store.loadConfig(configRootDir);
              console.log('配置已重新加载，UI将更新');
            } else {
              console.warn('无法获取当前配置根目录，无法自动刷新');
              toast.info('请手动刷新列表以查看更新');
            }
          }
        } catch (error) {
          console.error(`删除文件系统中的${type}失败:`, error);
          toast.error(`删除失败: ${error}`);
        }
      } else {
        console.error('preloadApi 不可用，无法删除文件系统中的文件');
        toast.error('文件系统操作不可用');
      }
    }
  } catch (error) {
    console.error(`删除${pendingDeleteType.value}失败:`, error);
    toast.error(`删除失败: ${error}`);
  } finally {
    // 重置状态
    pendingDeleteId.value = null;
    pendingDeleteType.value = null;
    confirmDialogVisible.value = false;
  }
};

</script>

<style scoped>
.box-shadow-inset {
  box-shadow: inset 2px 2px 0 2px rgba(255, 255, 255, 0.3),
              inset -2px -2px 0 2px rgba(255, 255, 255, 0.3);
}

.box-shadow-inset-white {
  box-shadow: inset 2px 2px 0 2px rgba(255, 255, 255, 1),
              inset -2px -2px 0 2px rgba(255, 255, 255, 1);
}
</style>
