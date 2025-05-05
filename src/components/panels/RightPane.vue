<template>
  <div class="right-pane flex flex-col h-full bg-card relative">
    <div class="py-2 px-4 border-b">
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          <div v-if="isFormModified && !userPreferences.preferences.hideUnsavedChangesWarning"
               class="mr-2 flex items-center"
          >
            <TooltipProvider :delay-duration="100">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div class="flex items-center">
                    <div class="w-3 h-3 rounded-full bg-red-500 animate-pulse-slow" title="内容已修改"></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                   <p>内容已修改</p>
                   </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <h3 class="text-lg font-semibold text-foreground m-0" v-html="headerTitle"></h3>
        </div>
        <div class="flex gap-2" v-if="selectedItem">
          <Button
            v-if="selectedItem.type === 'match'"
            size="sm"
            variant="outline"
            class="h-8 px-2 py-0 justify-center"
            @click="previewRule"
            title="预览片段"
          >
            <div class="flex items-center justify-center w-full">
              <EyeIcon class="h-4 w-4 mr-1" />
              <span>预览</span>
            </div>
          </Button>

          <!-- 保存按钮已隐藏，改为自动保存 -->
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 h-full">
       <div v-if="store.state.loading" class="flex flex-col justify-center items-center h-full gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <div class="text-primary font-medium">{{ store.state.statusMessage || '加载中...' }}</div>
      </div>
      <div v-else-if="!selectedItem" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <div class="text-5xl mb-4">👈</div>
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">未选择项目</h4>
        <p class="m-0 max-w-md">请从左侧列表选择一个规则或分组进行编辑</p>
      </div>
      <div v-else-if="selectedItem.type === 'match'" class="flex flex-col h-full">
        <RuleEditForm
          ref="ruleFormRef"
          :key="selectedItem.id"
          :rule="selectedItem"
          @modified="handleFormModified"
          @delete="deleteRule(selectedItem.id)"
        />
      </div>

    </div>

     <div v-if="showPreviewModal" class="fixed inset-0 z-[9999] flex items-center justify-center">
       <div class="absolute inset-0 bg-black/50" @click="showPreviewModal = false"></div>
       <div class="relative bg-background rounded-none shadow-lg w-full max-w-xl max-h-[80vh] overflow-hidden border">
         <div class="flex items-center justify-between p-4 border-b">
           <h2 class="text-lg font-semibold">预览 "{{ previewTrigger }}"</h2>
           <button @click="showPreviewModal = false" class="text-gray-500 hover:text-gray-700">
             <XIcon class="h-5 w-5" />
           </button>
         </div>
         <div class="p-4 overflow-auto max-h-[calc(80vh-120px)]">
           <div v-if="previewIsImage" class="space-y-4">
             <div class="p-3 border border-dashed rounded-md bg-muted/10">
               <p class="text-sm font-mono break-all">{{ previewContent }}</p>
             </div>
             <div class="flex justify-center">
               <img :src="previewContent" alt="图片预览" class="max-w-full max-h-[400px] object-contain border" @error="onPreviewImageError" />
             </div>
           </div>
           <div v-else class="p-3 border rounded-md bg-muted/10">
             <pre class="whitespace-pre-wrap text-sm">{{ previewContent }}</pre>
           </div>
         </div>
       </div>
     </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore'; // 使用重构后的 Store
import { useUserPreferences } from '../../store/useUserPreferences'; // 用户偏好设置 Store
import { useContextMenu } from '@/hooks/useContextMenu'; // 上下文菜单 Hook
import ClipboardManager from '@/utils/ClipboardManager'; // 剪贴板管理器
import TreeNodeRegistry from '@/utils/TreeNodeRegistry';
import { findItemInTreeById, findParentNodeInTree } from '@/utils/configTreeUtils'; // 导入 findParentNodeInTree
import type { Match } from '@/types/core/espanso.types'; // 导入类型
import type { ConfigTreeNode, ConfigFileNode } from '@/types/core/ui.types'; // 导入 ConfigFileNode
import type { TreeNodeItem } from '@/components/ConfigTree.vue';
import { toast } from 'vue-sonner'; // 导入 toast
import { isMacOS } from '@/lib/utils'; // 导入 isMacOS
import { SaveIcon, Loader2Icon, CheckIcon, XIcon, EyeIcon } from 'lucide-vue-next'; // 图标
import { Button } from '../ui/button'; // UI 组件
import { Checkbox } from '../ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import RuleEditForm from '../forms/RuleEditForm.vue';   // 规则编辑表单
import GroupEditForm from '../forms/GroupEditForm.vue'; // 分组编辑表单

// --- Refs 和 Store 实例 ---
const ruleFormRef = ref<InstanceType<typeof RuleEditForm> | null>(null);
const store = useEspansoStore();
const userPreferences = useUserPreferences();

// --- 本地状态 ---
const isFormModified = ref(false); // 本地状态跟踪表单是否修改
const isSaving = ref(false);
const saveState = ref<'idle' | 'success' | 'error'>('idle');
let saveStateTimeout: ReturnType<typeof setTimeout> | null = null;
const hideWarning = ref(userPreferences.preferences.hideUnsavedChangesWarning); // 不再提示选项
const showPreviewModal = ref(false);
const previewContent = ref("");
const previewTrigger = ref("");
const previewIsImage = ref(false);
const middlePaneRef = ref<any>(null); // 用于接收 MiddlePane 引用

// --- 计算属性 ---
const selectedItem = computed(() => store.selectedItem as Match | null); // 类型断言
const selectedId = computed(() => store.state.selectedItemId);

// 根据选中项动态生成标题
const headerTitle = computed(() => {
  const item = selectedItem.value;
  if (!item) return '详情';
  if (item.type === 'match') {
    let displayTrigger = item.trigger || (item.triggers && item.triggers.length > 0 ? `${item.triggers[0]}...` : '[无触发词]');
    return `编辑规则 <span class="ml-2 text-sm text-muted-foreground">${displayTrigger}</span>`;
  }
  return '详情';
});

// --- 方法 ---

// 监听表单子组件的 modified 事件
const handleFormModified = (modified: boolean) => {
  // console.log(`[RightPane] Form modified state received: ${modified}`); // 调试日志
  isFormModified.value = modified;
};

// 监听不再提示选项
watch(hideWarning, (newValue) => {
  userPreferences.updatePreference('hideUnsavedChangesWarning', newValue);
});

// 监听选中项变化，检查是否有未保存的修改
watch(()=>store.state.selectedItemId, (newId, oldId) => {
  // 如果有未保存的修改，显示确认对话框
  if (isFormModified.value && oldId) {
    const confirmResult = confirm('您有未保存的修改，确定要离开吗？');
    if (!confirmResult) {
      // 用户取消了操作，恢复之前的选择
      nextTick(() => {
        store.selectItem(oldId, store.state.selectedItemType);
      });
      return;
    }
  }

  // 重置修改状态
  isFormModified.value = false;
  // 清除可能存在的保存状态反馈
  if (saveStateTimeout) clearTimeout(saveStateTimeout);
  saveState.value = 'idle';
  isSaving.value = false;
}, { flush: 'post' });

// 预览规则
const previewRule = () => {
  if (selectedItem.value?.type === 'match' && ruleFormRef.value) {
    const formData = ruleFormRef.value.getFormData(); // 获取当前表单数据用于预览
    previewTrigger.value = formData.trigger || (formData.triggers ? formData.triggers[0] + '...' : '');
    previewContent.value = formData.content || '';
    previewIsImage.value = formData.contentType === 'image';
    showPreviewModal.value = true;
  }
};

// 处理预览图片加载错误
const onPreviewImageError = (e: Event) => {
    console.warn("Preview image failed to load:", previewContent.value);
    if (e.target) (e.target as HTMLElement).style.display = 'none'; // Hide broken image
     toast.error("图片预览加载失败，请检查路径是否正确。");
};

// 保存项目
const saveItem = async () => {
  const currentItem = selectedItem.value;
  if (!currentItem || isSaving.value) return;
  // ... (clear timeout logic) ...
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = null;
  }

  if (!isFormModified.value) {
    // ... (handle already saved case) ...
    saveState.value = 'success';
    saveStateTimeout = setTimeout(() => {
      saveState.value = 'idle';
    }, 1500);
    return;
  }

  isSaving.value = true;
  saveState.value = 'idle';

  let formData: Partial<Match> | null = null;
  let success = false;

  try {
    if (currentItem.type === 'match' && ruleFormRef.value) {
      formData = ruleFormRef.value.getFormData(); // Get data TO save
      if (!formData) throw new Error("无法获取规则表单数据");

      console.log('[RightPane] Saving Match:', currentItem.id, formData);
      await store.updateMatch(currentItem.id, formData as Partial<Match>); // Call Store Action

      // ----------------------------------------------------

      success = true;
      isFormModified.value = false; // Reset parent's modified state
      saveState.value = 'success';
      toast.success("保存成功！");

    } else {
      throw new Error("没有找到对应的表单组件或选中的项目类型无效");
    }

  } catch (error: any) {
    console.error('保存项目失败 (saveItem): ', error);
    saveState.value = 'error';
    toast.error(`保存失败: ${error.message || '未知错误'}`);
  } finally {
    isSaving.value = false;
    saveStateTimeout = setTimeout(() => {
      saveState.value = 'idle';
    }, success ? 1500 : 3000);
  }
};


// --- ContextMenu 和快捷键相关 (部分保留，部分需要调整) ---
const { handleCopyItem, handleCutItem } = useContextMenu({
  getNode: () => {
    const item = selectedItem.value;
    if (!item || (item.type !== 'match' )) return null;
    // 创建一个临时的 TreeNodeItem 供 useContextMenu 使用
    return {
      id: item.id,
      type: item.type,
      name: item.name || '',
      children: [],
      match: item.type === 'match' ? item : undefined,
      path: item.filePath || '', // 确保传递路径信息
      isSelected: true // 标记为选中
    };
  }
});

// --- 键盘快捷键处理 ---
const handleGlobalKeyDown = (event: KeyboardEvent) => {
  const key = event.key;
  const isModKey = event.metaKey || event.ctrlKey; // Command on Mac, Ctrl elsewhere

  const targetElement = event.target as HTMLElement;
  const isTextInput = targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable;

  // 保存快捷键 (Ctrl+S / Cmd+S)
  if (isModKey && key.toLowerCase() === 's') {
    event.preventDefault();
    console.log('[RightPane Shortcut] Save triggered.',{
      selectedItem: selectedItem.value,
      isFormModified: isFormModified.value,
      isSaving: isSaving.value
    });
    if (selectedItem.value && isFormModified.value && !isSaving.value) { // 只有在有修改且未保存时才触发
      console.log('[RightPane Shortcut] Save triggered.');
      if (ruleFormRef.value) {
        ruleFormRef.value.autoSave();
      }
    } else {
      console.log('[RightPane Shortcut] Save ignored (no changes or already saving).');
    }
    return;
  }

  // 在文本输入时不处理其他快捷键
  if (isTextInput || targetElement.tagName === 'SELECT') {
    return;
  }

  // --- 复制/剪切/粘贴/删除 (只在 Tree 聚焦时触发) ---
  const isTreeFocused = middlePaneRef.value?.getTreeFocusState() || false;
  if (!isTreeFocused) {
      // console.log('[RightPane Shortcut] Ignored: Tree not focused.'); // 可选调试日志
      return;
  }

  // 获取当前 store 中记录的选中项 ID (可能是在树中选中的ID)
  const selectedNodeIdInTree = store.state.selectedItemId;

  // 复制和剪切仍然依赖右侧面板选中的 Match
  const currentItemForCopyCut = selectedItem.value;
  if (isModKey && key.toLowerCase() === 'c') {
    if (currentItemForCopyCut && (currentItemForCopyCut.type === 'match')) {
      console.log('[RightPane Shortcut] Copy');
      handleCopyItem();
    } else {
       console.log('[RightPane Shortcut] Copy ignored: No valid item selected in right pane.');
    }
  } else if (isModKey && key.toLowerCase() === 'x') {
    if (currentItemForCopyCut && (currentItemForCopyCut.type === 'match' )) {
      console.log('[RightPane Shortcut] Cut');
      handleCutItem();
    } else {
      console.log('[RightPane Shortcut] Cut ignored: No valid item selected in right pane.');
    }
  } else if (isModKey && key.toLowerCase() === 'v') {
    console.log('[RightPane Shortcut] Paste triggered');
    if (!selectedNodeIdInTree) {
      console.log('[RightPane Shortcut] Paste ignored: No node selected in tree.');
      toast.error("请先在左侧树中选择粘贴位置");
      return;
    }

    if (!ClipboardManager.hasItem()) {
      console.log("[RightPane Shortcut] Paste ignored: Clipboard empty");
      toast.error("剪贴板为空");
      return;
    }

    const targetNode = findItemInTreeById(store.state.configTree, selectedNodeIdInTree);
    if (!targetNode) {
        console.error(`[RightPane Shortcut] Paste error: Target node ${selectedNodeIdInTree} not found in tree.`);
        toast.error("粘贴失败：找不到目标节点");
        return;
    }

    let targetParentIdForPaste: string | null = null;
    let insertIndexForPaste: number = 0;

    if (targetNode.type === 'folder') {
        console.log('[RightPane Shortcut] Paste ignored: Cannot paste directly into a folder via shortcut.');
        toast.error("无法直接粘贴到文件夹，请选择文件或片段。");
        return;
    } else if (targetNode.type === 'file') {
        targetParentIdForPaste = targetNode.id;
        insertIndexForPaste = 0; // 默认粘贴到文件开头
        console.log(`[RightPane Shortcut] Pasting into file: ${targetParentIdForPaste} at index ${insertIndexForPaste}`);
    } else if (targetNode.type === 'match') {
        const parentFileNode = findParentNodeInTree(store.state.configTree, targetNode.id);
        if (parentFileNode && parentFileNode.type === 'file') {
            targetParentIdForPaste = parentFileNode.id;
            const siblings = (parentFileNode as ConfigFileNode).matches || [];
            const currentMatchIndex = siblings.findIndex(m => m.id === targetNode.id);
            insertIndexForPaste = (currentMatchIndex !== -1) ? currentMatchIndex + 1 : siblings.length;
            console.log(`[RightPane Shortcut] Pasting after match ${targetNode.id} in file: ${targetParentIdForPaste} at index ${insertIndexForPaste}`);
        } else {
            console.error(`[RightPane Shortcut] Paste error: Could not find parent file for match ${targetNode.id}.`);
            toast.error("粘贴失败：无法找到片段所属的文件。");
            return;
        }
    }

    if (targetParentIdForPaste !== null) {
        // 调用 store action，传递正确的父节点 ID 和索引
        // store.pasteItem 内部会处理剪贴板内容和操作类型 (copy/cut)
        store.pasteItem(targetParentIdForPaste, insertIndexForPaste);
    } else {
         console.error('[RightPane Shortcut] Paste error: Could not determine target parent ID.');
         toast.error("粘贴失败：无法确定粘贴目标。");
    }
  } else if (
    // 删除快捷键逻辑
    (isMacOS() && event.metaKey && key === 'Backspace') ||
    (!isMacOS() && key === 'Delete')
  ) {
    // 检查树是否有焦点，以及是否有选中的节点ID
    if (!isTreeFocused || !selectedNodeIdInTree) {
      console.log('[RightPane Shortcut] Delete ignored: Tree not focused or no node selected.');
      return;
    }

    // 通过ID从树中查找实际选中的节点
    const nodeToDelete = findItemInTreeById(store.state.configTree, selectedNodeIdInTree);
    if (!nodeToDelete) {
      console.log('[RightPane Shortcut] Delete ignored: Selected node not found in tree.');
      return;
    }

    console.log(`[RightPane Shortcut] Delete triggered for node type: ${nodeToDelete.type}`);
    event.preventDefault(); // 阻止默认行为

    // 根据节点类型执行删除
    if (nodeToDelete.type === 'match') {
      // 保留对右侧面板编辑项的删除逻辑 (如果用户习惯于此)
      // 或者统一为只删除树中选中的项？ 暂时保留两种方式
       const currentItemForDelete = selectedItem.value;
       if(currentItemForDelete && currentItemForDelete.id === nodeToDelete.id) {
           deleteRule(nodeToDelete.id);
       } else {
           // 如果右侧编辑的不是选中的match，提示用户
           if (confirm(`是否要删除树中选中的片段: ${nodeToDelete.trigger || nodeToDelete.label}?`)) {
               store.deleteItem(nodeToDelete.id, 'match');
           }
       }
    } else if (nodeToDelete.type === 'file') {
      // 文件删除逻辑 - 使用 window.confirm，更新提示信息
      if (confirm(`确定要删除文件 "${nodeToDelete.name}" 及其包含的所有片段和分组吗？此操作不可撤销。`)) {
        store.deleteFileNode(nodeToDelete.id);
      }
    } else if (nodeToDelete.type === 'folder'){
        // 文件夹删除逻辑 - 使用 window.confirm
        if(confirm(`确定要删除文件夹 "${nodeToDelete.name}" 及其所有内容吗？此操作不可撤销。`)){
            store.deleteFolderNode(nodeToDelete.id);
        }
    }
  }
};

// --- 删除操作 ---
// 这两个方法由表单的 @delete 事件触发，或由快捷键触发
const deleteRule = (id: string) => {
  if (confirm('确定要删除这个规则吗？此操作无法撤销。')) {
    store.deleteItem(id, 'match'); // 调用新的 Store Action
    // store action 应该处理后续状态，例如清除选中项
  }
};


// --- 生命周期钩子 ---
onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
  }
});

// --- 兼容旧 API (已移除) ---
// const saveRule = async (...) => { ... } // 移除
// const saveGroup = async (...) => { ... } // 移除
// const mapContentToMatchFields = (...) => { ... } // 移除
// const cancelEdit = () => { ... } // 这个逻辑现在由表单内部处理或直接调用 store.selectItem(null, null)

// 暴露给父组件的方法 (如果需要)
defineExpose({
  middlePaneRef // 暴露给 MainLayout 以便传递
});

</script>

<style scoped> /* 使用 scoped 防止样式污染 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 保存按钮状态变化样式 */
.btn-save {
  transition: all 0.3s ease;
}
.btn-save.success {
  background-color: rgba(34, 197, 94, 0.1);
  border-color: rgb(34, 197, 94);
}
.btn-save.error {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgb(239, 68, 68);
}

/* 添加自定义的慢速脉冲动画 */
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 可以在这里添加 RightPane 特有的样式 */
</style>