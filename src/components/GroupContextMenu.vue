<template>
  <ContextMenu>
    <ContextMenuTrigger>
      <slot></slot>
    </ContextMenuTrigger>
    <ContextMenuContent class="w-48 !rounded-none">
      <!-- 通用菜单项：新建片段、新建分组 -->
      <ContextMenuItem @select="handleCreateMatch">
        <PlusIcon class="mr-2 h-4 w-4" />
        新建片段
      </ContextMenuItem>
      <ContextMenuItem @select="handleCreateGroup">
        <PlusIcon class="mr-2 h-4 w-4" />
        新建分组
      </ContextMenuItem>
      <ContextMenuSeparator />

      <!-- 分组特有菜单项 -->
      <ContextMenuItem @select="handleCopyNodeName">
        <ClipboardCopyIcon class="mr-2 h-4 w-4" />
        复制名称
      </ContextMenuItem>
      <ContextMenuItem @select="handleCopyItem">
        <ClipboardCopyIcon class="mr-2 h-4 w-4" />
        复制分组
      </ContextMenuItem>
      <ContextMenuItem @select="handleCutItem">
        <ScissorsIcon class="mr-2 h-4 w-4" />
        剪切分组
      </ContextMenuItem>
      <ContextMenuSeparator />

      <!-- 粘贴菜单项 -->
      <ContextMenuItem @select="handlePasteItem" :disabled="!ClipboardManager.hasItem()">
        <ClipboardPasteIcon class="mr-2 h-4 w-4" />
        粘贴
      </ContextMenuItem>
      <ContextMenuSeparator />

      <!-- 展开/收起菜单项 -->
      <ContextMenuItem @select="handleExpandAll">
        <PlusSquareIcon class="mr-2 h-4 w-4" />
        全部展开
      </ContextMenuItem>
      <ContextMenuItem @select="handleCollapseAll">
        <MinusSquareIcon class="mr-2 h-4 w-4" />
        全部收起
      </ContextMenuItem>
      <ContextMenuItem @select="handleExpandCurrentGroup">
        <PlusSquareIcon class="mr-2 h-4 w-4" />
        展开当前分组
      </ContextMenuItem>
      <ContextMenuItem @select="handleCollapseCurrentGroup">
        <MinusSquareIcon class="mr-2 h-4 w-4" />
        收起当前分组
      </ContextMenuItem>
      <ContextMenuItem @select="handleExpandCurrentFile">
        <FolderOpenIcon class="mr-2 h-4 w-4" />
        展开当前标签文件夹
      </ContextMenuItem>
      <ContextMenuItem @select="handleCollapseCurrentFile">
        <FolderIcon class="mr-2 h-4 w-4" />
        收起当前标签文件夹
      </ContextMenuItem>
      <ContextMenuSeparator />

      <!-- 删除菜单项 -->
      <ContextMenuItem @select="handleDeleteGroup" variant="destructive">
        <Trash2Icon class="mr-2 h-4 w-4" />
        删除分组
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  Trash2Icon,
  ClipboardCopyIcon,
  ScissorsIcon,
  ClipboardPasteIcon,
  MinusSquareIcon,
  PlusSquareIcon,
  FolderIcon,
  FolderOpenIcon
} from "lucide-vue-next";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
import { useEspansoStore } from '@/store/useEspansoStore';
import { toast } from 'vue-sonner';
import ClipboardManager from '@/utils/ClipboardManager';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry';
import type { TreeNodeItem } from "./ConfigTree.vue";
import type { Match, Group } from "@/types/espanso";
import { ref, computed, defineProps, defineEmits, watch, onMounted, onUnmounted, Ref } from "vue";

const props = defineProps<{
  node: TreeNodeItem;
  isOpen: Boolean;
}>();

const store = useEspansoStore();

// --- Add console log on mount ---
onMounted(() => {
  console.log(`[GroupContextMenu] Mounted for node: ${props.node.name} (ID: ${props.node.id})`);
});
// --- End console log ---

// 复制节点名称
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

// 复制片段或分组到剪贴板
const handleCopyItem = () => {
  if (props.node.type === 'group' && props.node.group) {
    ClipboardManager.copyItem(props.node.group);
    toast.success('分组已复制到剪贴板');
  }
};

// 剪切片段或分组到剪贴板
const handleCutItem = () => {
  if (props.node.type === 'group' && props.node.group) {
    ClipboardManager.cutItem(props.node.group);
    toast.success('分组已剪切到剪贴板');
    // 如果是剪切操作，需要删除原始项目
    store.deleteItem(props.node.id, 'group');
  }
};

// 粘贴片段或分组
const handlePasteItem = () => {
  const { item, operation } = ClipboardManager.getItem();

  if (!item) {
    toast.error('剪贴板为空');
    return;
  }

  // 获取当前节点的文件路径
  let targetFilePath = '';
  if (props.node.type === 'group' && props.node.group) {
    targetFilePath = props.node.group.filePath || '';
  }

  if (!targetFilePath) {
    toast.error('无法确定目标文件路径');
    return;
  }

  // 创建新项目的副本
  const newItem = JSON.parse(JSON.stringify(item));

  // 生成新的ID
  newItem.id = `${newItem.type}-${Math.random().toString(36).substring(2, 11)}`;

  // 设置文件路径
  newItem.filePath = targetFilePath;

  // 添加到存储
  store.addItem(newItem);

  toast.success(`${newItem.type === 'match' ? '片段' : '分组'}已粘贴`);

  // 如果是剪切操作，清空剪贴板
  if (operation === 'cut') {
    ClipboardManager.clear();
  }
};

// 新建片段
const handleCreateMatch = () => {
  // 获取当前节点的文件路径
  let targetFilePath = '';
  if (props.node.type === 'group' && props.node.group) {
    targetFilePath = props.node.group.filePath || '';
  }

  if (!targetFilePath) {
    toast.error('无法确定目标文件路径');
    return;
  }

  // 创建新片段
  const newMatch: Match = {
    id: `match-${Math.random().toString(36).substring(2, 11)}`,
    type: 'match',
    trigger: ':new',
    replace: '新片段',
    filePath: targetFilePath
  };

  // 添加到存储
  store.addItem(newMatch);

  toast.success('新片段已创建');
};

// 新建分组
const handleCreateGroup = () => {
  // 获取当前节点的文件路径
  let targetFilePath = '';
  if (props.node.type === 'group' && props.node.group) {
    targetFilePath = props.node.group.filePath || '';
  }

  if (!targetFilePath) {
    toast.error('无法确定目标文件路径');
    return;
  }

  // 创建新分组
  const newGroup: Group = {
    id: `group-${Math.random().toString(36).substring(2, 11)}`,
    type: 'group',
    name: '新分组',
    matches: [],
    groups: [],
    filePath: targetFilePath
  };

  // 添加到存储
  store.addItem(newGroup);

  toast.success('新分组已创建');
};

// 全部展开
const handleExpandAll = () => {
  console.log('[GroupContextMenu] Expanding all...');
  TreeNodeRegistry.expandAll();
  toast.success('已展开所有节点');
};

// 全部收起
const handleCollapseAll = () => {
  console.log('[GroupContextMenu] Collapsing all...');
  TreeNodeRegistry.collapseAll();
  toast.success('已收起所有节点');
};

// 展开当前分组及其子项
const handleExpandCurrentGroup = () => {
  console.log(`[GroupContextMenu] Expanding current group: ${props.node.id}`);
  TreeNodeRegistry.expandNodeAndChildren(props.node.id);
  toast.success('已展开当前分组及其子项');
};

// 收起当前分组及其子项
const handleCollapseCurrentGroup = () => {
  console.log(`[GroupContextMenu] Collapsing current group: ${props.node.id}`);
  TreeNodeRegistry.collapseNodeAndChildren(props.node.id);
  toast.success('已收起当前分组及其子项');
};

// 展开当前文件下的所有节点
const handleExpandCurrentFile = () => {
  const metadata = TreeNodeRegistry.getMetadata(props.node.id);
  if (metadata?.filePath) {
    console.log(`[GroupContextMenu] Expanding all nodes in file: ${metadata.filePath}`);
    TreeNodeRegistry.expandNodesByFile(metadata.filePath);
    toast.success('已展开当前文件下的所有节点');
  } else {
    console.warn('[GroupContextMenu] Could not find file path for current node to expand file.');
    toast.error('无法确定当前文件路径');
  }
};

// 收起当前文件下的所有节点
const handleCollapseCurrentFile = () => {
  const metadata = TreeNodeRegistry.getMetadata(props.node.id);
  if (metadata?.filePath) {
    console.log(`[GroupContextMenu] Collapsing all nodes in file: ${metadata.filePath}`);
    TreeNodeRegistry.collapseNodesByFile(metadata.filePath);
    toast.success('已收起当前文件下的所有节点');
  } else {
    console.warn('[GroupContextMenu] Could not find file path for current node to collapse file.');
    toast.error('无法确定当前文件路径');
  }
};

// 删除分组
const handleDeleteGroup = () => {
  if (props.node.type === 'group') {
    if (confirm('确定要删除这个分组及其所有内容吗？此操作无法撤销。')) {
      store.deleteItem(props.node.id, 'group');
    }
  }
};
</script>
