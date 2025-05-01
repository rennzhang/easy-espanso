<template>
  <div class="right-pane flex flex-col h-full bg-card">
    <div class="py-2 px-4 border-b border-border">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold text-foreground m-0">{{ headerTitle }}</h3>
        <div class="flex gap-2" v-if="selectedItem">
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

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="loading" class="flex flex-col justify-center items-center h-full gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <div class="text-primary font-medium">加载中...</div>
      </div>
      <div v-else-if="!selectedItem" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <div class="text-5xl mb-4">👈</div>
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">未选择项目</h4>
        <p class="m-0 max-w-md">请从左侧列表选择一个规则或分组进行编辑</p>
      </div>
      <div v-else-if="selectedItem.type === 'match'" class="max-w-2xl mx-auto">
        <RuleEditForm
          ref="ruleFormRef"
          :rule="selectedItem"
          @cancel="cancelEdit"
          @delete="deleteRule"
        />
      </div>
      <div v-else-if="selectedItem.type === 'group'" class="max-w-2xl mx-auto">
        <GroupEditForm
          ref="groupFormRef"
          :group="selectedItem"
          @cancel="cancelEdit"
          @delete="deleteGroup"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import { SaveIcon, Loader2Icon, CheckIcon, XIcon } from 'lucide-vue-next';
import { Button } from '../ui/button';
import RuleEditForm from '../forms/RuleEditForm.vue';
import GroupEditForm from '../forms/GroupEditForm.vue';
import type { Match, Group } from '../../types/espanso';

// Define refs for the form components
const ruleFormRef = ref<InstanceType<typeof RuleEditForm> | null>(null);
const groupFormRef = ref<InstanceType<typeof GroupEditForm> | null>(null);

const store = useEspansoStore();
const selectedItem = computed(() => {
  const id = store.state.selectedItemId;
  if (!id) return null;
  const item = store.findItemById(id);
  return item;
});
const loading = computed(() => false);

// State for save button
const isSaving = ref(false);
const saveState = ref<'idle' | 'success' | 'error'>('idle');
let saveStateTimeout: ReturnType<typeof setTimeout> | null = null;

// 标题
const headerTitle = computed(() => {
  if (!selectedItem.value) return '详情';

  if (selectedItem.value.type === 'match') {
    return `编辑规则: ${(selectedItem.value as Match).trigger}`;
  } else if (selectedItem.value.type === 'group') {
    return `编辑分组: ${(selectedItem.value as Group).name}`;
  }

  return '详情';
});

// 不再需要格式化日期函数

// 保存项目
const saveItem = async () => {
  if (!selectedItem.value || isSaving.value) return;

  // Clear previous timeout if any
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = null;
  }

  isSaving.value = true;
  saveState.value = 'idle';

  let currentFormData: Partial<Match> | Partial<Group> | null = null;
  let formType: 'match' | 'group' | null = null;

  // Get current data from the active form using refs
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
    store.showToast('保存失败: 无法获取表单数据', 'error', 0, true);
    return;
  }

  try {
    if (formType === 'match') {
      await saveRule(selectedItem.value.id, currentFormData as Partial<Match> & { content?: string, contentType?: string });
    } else if (formType === 'group') {
      await saveGroup(selectedItem.value.id, currentFormData as Partial<Group>);
    }
    isSaving.value = false;
    saveState.value = 'success';
    saveStateTimeout = setTimeout(() => { saveState.value = 'idle'; }, 1500);

  } catch (error: any) {
    console.error('保存项目失败 (saveItem): ', error);
    isSaving.value = false;
    saveState.value = 'error';
    saveStateTimeout = setTimeout(() => { saveState.value = 'idle'; }, 2000);
    store.showToast(`保存失败: ${error.message || '未知错误'}`, 'error', 0, true);
  }
};

// 保存规则 - Now calls store actions and expects success/failure
const saveRule = async (id: string, updatedRuleData: Partial<Match> & { content?: string, contentType?: string }) => {
  // Map content/contentType back to specific Match fields
  const mappedFields = mapContentToMatchFields(updatedRuleData.content, updatedRuleData.contentType);
  const cleanedDataToMerge: Partial<Match> = {
    ...updatedRuleData,
    content: undefined,
    contentType: undefined,
    ...mappedFields,
    left_word: updatedRuleData.leftWord,
    right_word: updatedRuleData.rightWord,
    propagate_case: updatedRuleData.propagateCase,
    uppercase_style: updatedRuleData.uppercaseStyle || undefined,
    force_mode: updatedRuleData.forceMode || undefined,
  };
  delete cleanedDataToMerge.leftWord;
  delete cleanedDataToMerge.rightWord;
  delete cleanedDataToMerge.propagateCase;
  delete cleanedDataToMerge.uppercaseStyle;
  delete cleanedDataToMerge.forceMode;

  try {
    // 1. Update state
    store.updateConfigState(id, cleanedDataToMerge);
    // 2. Get item for save
    const itemToSave = store.findItemById(id);
    if (!itemToSave || itemToSave.type !== 'match') {
        throw new Error(`无法在状态中找到ID为 ${id} 的规则。`);
    }
    // 3. Save to file
    await store.saveItemToFile(itemToSave);
    // Success! RightPane's saveItem will handle showing confirmation.
  } catch (error) {
      console.error('保存规则失败 (saveRule):', error);
      throw error; // Re-throw error to be caught by saveItem
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
    // 1. Update state
    store.updateConfigState(id, cleanedDataToMerge);
    // 2. Get item for save
    const itemToSave = store.findItemById(id);
    if (!itemToSave || itemToSave.type !== 'group') {
        throw new Error(`无法在状态中找到ID为 ${id} 的分组。`);
    }
    // 3. Save to file
    await store.saveItemToFile(itemToSave);
    // Success! RightPane's saveItem will handle showing confirmation.
  } catch (error) {
      console.error('保存分组失败 (saveGroup):', error);
      throw error; // Re-throw error to be caught by saveItem
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
    // TODO: Trigger save after deletion?
    store.state.selectedItemId = null; // Clear selection after delete
  }
};

// 删除分组
const deleteGroup = (id: string) => {
  if (confirm('确定要删除这个分组及其所有内容吗？此操作无法撤销。')) {
    store.deleteItem(id, 'group');
    // TODO: Trigger save after deletion?
    store.state.selectedItemId = null; // Clear selection after delete
  }
};
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


