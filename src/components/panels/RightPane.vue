<template>
  <div class="right-pane flex flex-col h-full bg-card relative">
    <div class="py-2 px-4 border-b">
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          <!-- 未保存状态指示器 -->
          <div v-if="store.state.hasUnsavedChanges && !userPreferences.preferences.hideUnsavedChangesWarning"
            class="mr-2 flex items-center"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <div class="flex items-center">
                    <div class="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>内容已修改，请记得保存</p>
                  <div class="flex items-center">
                    <Checkbox id="hideWarning" v-model="hideWarning" />
                    <label for="hideWarning" class="ml-2">不再提示</label>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <h3 class="text-lg font-semibold text-foreground m-0" v-html="headerTitle"></h3>
        </div>
        <div class="flex gap-2" v-if="selectedItem">
          <!-- 预览按钮 -->
          <Button
            v-if="selectedItem.type === 'match'"
            size="sm"
            variant="outline"
            class="h-8 px-2 py-0 justify-center"
            @click="previewRule"
          >
            <div class="flex items-center justify-center w-full">
              <EyeIcon class="h-4 w-4 mr-1" />
              <span>预览</span>
            </div>
          </Button>

          <!-- 保存按钮 -->
          <Button
            size="sm"
            variant="outline"
            class="h-8 px-2 py-0 w-28 justify-center"
            @click="saveItem"
            :disabled="isSaving"
          >
            <Transition name="fade" mode="out-in">
              <div v-if="isSaving" key="saving" class="flex items-center justify-center w-full">
                <Loader2Icon class="h-4 w-4 mr-1 animate-spin" />
                <span>保存中...</span>
              </div>
              <div v-else-if="saveState === 'success'" key="success" class="flex items-center justify-center w-full">
                <CheckIcon class="h-4 w-4 mr-1 text-green-500" />
                <span>已保存</span>
              </div>
              <div v-else-if="saveState === 'error'" key="error" class="flex items-center justify-center w-full">
                <XIcon class="h-4 w-4 mr-1 text-red-500" />
                <span>保存失败</span>
              </div>
              <div v-else key="idle" class="flex items-center justify-center w-full">
                <SaveIcon class="h-4 w-4 mr-1" />
                <span>保存</span>
              </div>
            </Transition>
          </Button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 h-full">
      <div v-if="loading" class="flex flex-col justify-center items-center h-full gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <div class="text-primary font-medium">加载中...</div>
      </div>
      <div v-else-if="!selectedItem && !(selectedId && (selectedId.startsWith('file-')))" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <div class="text-5xl mb-4">👈</div>
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">未选择项目</h4>
        <p class="m-0 max-w-md">请从左侧列表选择一个规则或分组进行编辑</p>
      </div>
      <div v-else-if="selectedItem && selectedItem.type === 'match'" class="flex flex-col gap-4 h-full" >
        <RuleEditForm
          ref="ruleFormRef"
          :rule="selectedItem"
          @cancel="cancelEdit"
          @delete="deleteRule"
        />
      </div>
      <div v-else-if="(selectedItem && selectedItem.type === 'group') || (selectedId && selectedId.startsWith('file-'))" >
        <GroupEditForm
          ref="groupFormRef"
          :group="selectedItem || createGroupFromFileNode(selectedId)"
          @cancel="cancelEdit"
          @delete="deleteGroup"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import { useUserPreferences } from '../../store/useUserPreferences';
import { useContextMenu } from '@/hooks/useContextMenu';
import ClipboardManager from '@/utils/ClipboardManager';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry';
import type { TreeNodeItem } from "@/components/ConfigTree.vue";
import { SaveIcon, Loader2Icon, CheckIcon, XIcon, EyeIcon, FolderIcon, FileIcon, PlusIcon, GitBranchIcon } from 'lucide-vue-next';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import RuleEditForm from '../forms/RuleEditForm.vue';
import GroupEditForm from '../forms/GroupEditForm.vue';
import type { Match, Group } from '../../types/espanso';
import { toast } from 'vue-sonner';

// Define refs for the form components
const ruleFormRef = ref<InstanceType<typeof RuleEditForm> | null>(null);
const groupFormRef = ref<InstanceType<typeof GroupEditForm> | null>(null);

const store = useEspansoStore();
const userPreferences = useUserPreferences();

// 不再提示选项
const hideWarning = ref(userPreferences.preferences.hideUnsavedChangesWarning);

// 监听 hideWarning 变化
watch(hideWarning, (newValue) => {
  userPreferences.updatePreference('hideUnsavedChangesWarning', newValue);
});

// 检测是否为 macOS 系统
const isMacOS = (): boolean => {
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
};

const selectedItem = computed(() => {
  const id = store.state.selectedItemId;
  if (!id) return null;
  return store.findItemById(id);
});
const loading = computed(() => false);

// State for save button
const isSaving = ref(false);
const saveState = ref<'idle' | 'success' | 'error'>('idle');
let saveStateTimeout: ReturnType<typeof setTimeout> | null = null;

// --- Node Tracking for Context Menu ---
const getContextMenuNode = (): TreeNodeItem | null => {
  const currentItem = selectedItem.value;
  if (!currentItem) return null;

  return {
    id: currentItem.id,
    name: currentItem.type === 'group' ? currentItem.name : (currentItem.label || currentItem.trigger || ''),
    type: currentItem.type,
    path: currentItem.filePath,
    match: currentItem.type === 'match' ? currentItem : undefined,
    group: currentItem.type === 'group' ? currentItem : undefined,
    children: [] // 必需字段
  } as TreeNodeItem;
};

// 使用contextMenu
const {
    handleCopyItem,
    handleCutItem,
    handlePasteItem
} = useContextMenu({ getNode: getContextMenuNode });

// 标题
const headerTitle = computed(() => {
  if (!selectedItem.value) return '详情';

  if (selectedItem.value.type === 'match') {
    const match = selectedItem.value as Match;
    let displayTrigger = '';

    if (match.triggers && match.triggers.length > 0) {
      if (match.triggers.length > 1) {
        displayTrigger = match.triggers.slice(0, 3).join(', ') + (match.triggers.length > 3 ? '...' : '');
      } else {
        displayTrigger = match.triggers[0];
      }
    } else if (match.trigger) {
      displayTrigger = match.trigger;
    } else {
      displayTrigger = '[无触发词]';
    }

    // Return HTML string with span for styling
    return `编辑规则 <span class="ml-2 text-sm text-muted-foreground">${displayTrigger}</span>`;
  } else if (selectedItem.value.type === 'group') {
    // For groups, just return plain text
    return `编辑分组 ${(selectedItem.value as Group).name}`;
  }

  return '详情';
});

// 引用中间面板组件
const middlePaneRef = ref<InstanceType<typeof import('./MiddlePane.vue').default> | null>(null);

// --- Keyboard Shortcut Handler ---
const handleGlobalKeyDown = (event: KeyboardEvent) => {
  const key = event.key;
  const isModKey = event.metaKey || event.ctrlKey;

  const targetElement = event.target as HTMLElement;
  const isTextInput = targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable;

  // 特殊处理保存快捷键 (Ctrl+S / Command+S)
  if (isModKey && key.toLowerCase() === 's') {
    console.log('Shortcut: Save');
    event.preventDefault();
    saveItem();
    return;
  }

  // 如果是文本输入元素或下拉框，不处理复制剪切粘贴和删除快捷键
  if (isTextInput || targetElement.tagName === 'SELECT') {
    return;
  }

  // 检查树组件是否聚焦
  const isTreeFocused = middlePaneRef.value?.getTreeFocusState() || false;
  
  // 添加日志，帮助调试
  if (isModKey && (key.toLowerCase() === 'c' || key.toLowerCase() === 'x' || key.toLowerCase() === 'v' || key === 'Delete' || key === 'Backspace')) {
    console.log('快捷键检测：', key, '树组件聚焦状态:', isTreeFocused);
  }

  // 如果树组件未聚焦，不处理复制剪切粘贴和删除快捷键
  if (!isTreeFocused) {
    console.log('快捷键被忽略：节点树未聚焦');
    return;
  }

  // 检查是否在右侧面板（表单区域）内
  const rightPane = document.querySelector('.right-pane');
  const treeContainer = document.querySelector('.config-tree');
  const isInRightPane = rightPane && rightPane.contains(targetElement) && 
                        !treeContainer?.contains(targetElement);

  // 如果在右侧面板内但不在树节点区域，不处理复制剪切粘贴操作
  if (isInRightPane) {
    console.log('快捷键被忽略：在表单区域内');
    return;
  }

  // 检查是否有选中的节点
  if (!store.state.selectedItemId) {
    return;
  }

  const currentSelectedItem = selectedItem.value;

  if (!currentSelectedItem) {
    return;
  }

  if (isModKey && key.toLowerCase() === 'c') {
    console.log('Shortcut: Copy');
    if (currentSelectedItem.type === 'match' || currentSelectedItem.type === 'group') {
      handleCopyItem();
    }
  } else if (isModKey && key.toLowerCase() === 'x') {
    console.log('Shortcut: Cut');
    if (currentSelectedItem.type === 'match' || currentSelectedItem.type === 'group') {
      handleCutItem();
    }
  } else if (isModKey && key.toLowerCase() === 'v') {
    console.log('Shortcut: Paste');
    if (ClipboardManager.hasItem()) {
      handlePasteItem();
    } else {
      console.log("Paste shortcut ignored: Clipboard empty");
    }
  } else if (
    // macOS: Command+Backspace
    (isMacOS() && event.metaKey && key === 'Backspace') ||
    // Windows/Linux: Delete
    (!isMacOS() && key === 'Delete')
  ) {
    console.log('Shortcut: Delete');
    if (currentSelectedItem.type === 'match') {
      event.preventDefault();
      // 直接使用确认对话框，而不是通过 prepareDeleteMatch
      if (confirm('确定要删除这个规则吗？此操作无法撤销。')) {
        store.deleteItem(currentSelectedItem.id, 'match');
        store.state.selectedItemId = null;
      }
    } else if (currentSelectedItem.type === 'group') {
      event.preventDefault();
      // 直接使用确认对话框，而不是通过 prepareDeleteGroup
      if (confirm('确定要删除这个分组及其所有内容吗？此操作无法撤销。')) {
        store.deleteItem(currentSelectedItem.id, 'group');
        store.state.selectedItemId = null;
      }
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
  }
});

// 保存项目
const saveItem = async () => {
  if (!selectedItem.value || isSaving.value) return;

  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = null;
  }

  isSaving.value = true;
  saveState.value = 'idle';

  let currentFormData: Partial<Match> | Partial<Group> | null = null;
  let formType: 'match' | 'group' | null = null;

  if (selectedItem.value.type === 'match' && ruleFormRef.value) {
    currentFormData = ruleFormRef.value.getFormData();

    formType = 'match';
  } else if (selectedItem.value.type === 'group' && groupFormRef.value) {
    currentFormData = groupFormRef.value.getFormData();
    formType = 'group';
  }

  if (!currentFormData || !formType) {
    console.error('无法从表单组件获取当前数据或类型!');
    isSaving.value = false;
    saveState.value = 'error';
    saveStateTimeout = setTimeout(() => { saveState.value = 'idle'; }, 2000);
    toast.error('保存失败: 无法获取表单数据');
    return;
  }

  try {
    if (formType === 'match') {
      await saveRule(selectedItem.value.id, currentFormData as Match & { content?: string, contentType?: string });
    } else if (formType === 'group') {
      await saveGroup(selectedItem.value.id, currentFormData as Partial<Group>);
    }
    isSaving.value = false;
    saveState.value = 'success';
    saveStateTimeout = setTimeout(() => { saveState.value = 'idle'; }, 1500);

    // 重置未保存状态
    store.state.hasUnsavedChanges = false;

  } catch (error: any) {
    console.error('保存项目失败 (saveItem): ', error);
    isSaving.value = false;
    saveState.value = 'error';
    saveStateTimeout = setTimeout(() => { saveState.value = 'idle'; }, 2000);
    toast.error(`保存失败: ${error.message || '未知错误'}`);
  }
};

// 保存规则 - Now calls store actions and expects success/failure
const saveRule = async (id: string, updatedRuleData: Match & { content?: string, contentType?: string }) => {
  console.log("saveRule 更新规则数据:", updatedRuleData);
  const mappedFields = mapContentToMatchFields(updatedRuleData.content, updatedRuleData.contentType);
  console.log("saveRule 映射内容字段:", mappedFields);
  const cleanedDataToMerge: Partial<Match> = {
    ...updatedRuleData,
    content: undefined,
    contentType: undefined,
    ...mappedFields,
    left_word: updatedRuleData.left_word,
    right_word: updatedRuleData.right_word,
    propagate_case: updatedRuleData.propagate_case,
    uppercase_style: updatedRuleData.uppercase_style || undefined,
    force_mode: updatedRuleData.force_mode || undefined,
  };
  console.log("saveRule 合并数据:", cleanedDataToMerge);

  console.log("saveRule 设置force_mode字段:", cleanedDataToMerge);

  try {
    store.updateConfigState(id, cleanedDataToMerge);
    const itemToSave = store.findItemById(id);
    if (!itemToSave || itemToSave.type !== 'match') {
        throw new Error(`无法在状态中找到ID为 ${id} 的规则。`);
    }
    await store.saveItemToFile(itemToSave);
  } catch (error) {
      console.error('保存规则失败 (saveRule):', error);
      throw error;
  }
};

// Helper function (copied from RuleEditForm logic, can be moved to utils)
const mapContentToMatchFields = (content?: string, contentType?: string): Partial<Match> => {
  if (content === undefined || content === null) return {};
  switch (contentType) {
    case 'markdown':
      return { markdown: content, replace: undefined, html: undefined, image_path: undefined };
    case 'html':
      return { html: content, replace: undefined, markdown: undefined, image_path: undefined };
    case 'image':
      return { image_path: content, replace: undefined, markdown: undefined, html: undefined };
    case 'form':
      return { replace: content, markdown: undefined, html: undefined, image_path: undefined }; // Assuming form definition goes to replace
    case 'plain':
    default:
      return { replace: content, markdown: undefined, html: undefined, image_path: undefined };
  }
};

// 保存分组 - Now calls store actions and expects success/failure
const saveGroup = async (id: string, updatedGroupData: Partial<Group>) => {
  const cleanedDataToMerge: Partial<Group> = { ...updatedGroupData };
  try {
    store.updateConfigState(id, cleanedDataToMerge);
    const itemToSave = store.findItemById(id);
    if (!itemToSave || itemToSave.type !== 'group') {
        throw new Error(`无法在状态中找到ID为 ${id} 的分组。`);
    }
    await store.saveItemToFile(itemToSave);
  } catch (error) {
      console.error('保存分组失败 (saveGroup):', error);
      throw error;
  }
};

// 取消编辑
const cancelEdit = () => {
  store.state.selectedItemId = null;
};

// 删除规则
const deleteRule = (id: string) => {
  if (confirm('确定要删除这个规则吗？此操作无法撤销。')) {
    store.deleteItem(id, 'match');
    store.state.selectedItemId = null;
  }
};

// 删除分组
const deleteGroup = (id: string) => {
  if (confirm('确定要删除这个分组及其所有内容吗？此操作无法撤销。')) {
    store.deleteItem(id, 'group');
    store.state.selectedItemId = null;
  }
};

// 预览规则
const previewRule = () => {
  if (selectedItem.value?.type === 'match' && ruleFormRef.value) {
    ruleFormRef.value.showPreview();
  }
};

// New functions for file/folder handling
const selectedId = computed(() => store.state.selectedItemId);

// 从树状结构中获取节点信息
const findNodeInTree = (nodeId: string | null): any | null => {
  if (!nodeId) return null;

  // 递归查找函数
  const findNode = (nodes: any[]): any | null => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }

      // 递归查找子节点
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        const found = findNode(node.children);
        if (found) return found;
      }

      // 查找子级matches和groups
      if (node.matches && Array.isArray(node.matches) && node.matches.length > 0) {
        for (const match of node.matches) {
          if (match.id === nodeId) {
            return match;
          }
        }
      }

      if (node.groups && Array.isArray(node.groups) && node.groups.length > 0) {
        for (const group of node.groups) {
          if (group.id === nodeId) {
            return group;
          }

          // 查找组内的matches
          if (group.matches && Array.isArray(group.matches)) {
            for (const match of group.matches) {
              if (match.id === nodeId) {
                return match;
              }
            }
          }
        }
      }
    }
    return null;
  };

  return findNode(store.state.configTree || []);
};

const getSelectedNodeName = (): string => {
  if (!selectedId.value) return '未命名节点';

  // 先尝试从树状结构中获取
  const treeNode = findNodeInTree(selectedId.value);
  if (treeNode) {
    return treeNode.name || '未命名节点';
  }

  // 如果是match或group，使用常规方法
  const item = store.findItemById(selectedId.value);
  if (item?.type === 'match') {
    return item.label || item.trigger || '未命名规则';
  } else if (item?.type === 'group') {
    return item.name || '未命名分组';
  }

  return '未命名节点';
};

const getSelectedNodePath = (): string => {
  if (!selectedId.value) return '';

  // 先尝试从树状结构中获取
  const treeNode = findNodeInTree(selectedId.value);
  if (treeNode) {
    return treeNode.path || '';
  }

  // 如果是match或group，使用filePath
  const item = store.findItemById(selectedId.value);
  if (item) {
    return item.filePath || '';
  }

  return '';
};

const getNodeChildCount = (): number => {
  if (!selectedId.value) return 0;

  // 从树状结构中获取子节点数量
  const treeNode = findNodeInTree(selectedId.value);
  if (treeNode && treeNode.children) {
    return treeNode.children.length;
  }

  return 0;
};

const handleCreateMatch = () => {
  if (!selectedId.value) return;

  // 调用useContextMenu中的创建规则函数
  const contextMenuNode = getContextMenuNode();
  if (contextMenuNode) {
    handleCreateMatchInNode(contextMenuNode);
  }
};

const handleCreateGroup = () => {
  if (!selectedId.value) return;

  // 调用useContextMenu中的创建分组函数
  const contextMenuNode = getContextMenuNode();
  if (contextMenuNode) {
    handleCreateGroupInNode(contextMenuNode);
  }
};

// 实现创建规则的函数
const handleCreateMatchInNode = (node: TreeNodeItem) => {
  console.log('在节点中创建规则:', node);
  // 使用contextMenu中的创建规则函数
  const { handleCreateMatch } = useContextMenu({ getNode: () => node });
  handleCreateMatch();
};

// 实现创建片段的函数
const handleCreateGroupInNode = (node: TreeNodeItem) => {
  console.log('在节点中创建片段:', node);
  // 使用contextMenu中的创建片段函数
  const { handleCreateMatch } = useContextMenu({ getNode: () => node });
  handleCreateMatch();
};

// New function to create a group from a file node
const createGroupFromFileNode = (nodeId: string | null): Group => {
  if (!nodeId) {
    // 默认值
    return {
      id: `temp-group-${Date.now()}`,
      type: 'group',
      name: '新文件组',
      matches: [],
      groups: [],
      filePath: store.state.configPath || ''
    } as Group;
  }

  return {
    id: nodeId,
    type: 'group',
    name: getSelectedNodeName(),
    matches: [],
    groups: [],
    filePath: getSelectedNodePath() || store.state.configPath || ''
  } as Group;
};

// 向外部暴露方法和属性
defineExpose({
  middlePaneRef,
  handleGlobalKeyDown
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>


