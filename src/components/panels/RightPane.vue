<template>
  <div class="right-pane flex flex-col h-full bg-card">
    <div class="py-2 px-4 border-b border-border">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold text-foreground m-0">{{ headerTitle }}</h3>
        <div class="flex gap-2" v-if="selectedItem">
          <Button size="sm" variant="outline" class="h-8 px-2 py-0" @click="saveItem">
            <SaveIcon class="h-4 w-4 mr-1" />
            保存
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
          @save="saveRule"
          @cancel="cancelEdit"
          @delete="deleteRule"
        />
      </div>
      <div v-else-if="selectedItem.type === 'group'" class="max-w-2xl mx-auto">
        <GroupEditForm
          ref="groupFormRef"
          :group="selectedItem"
          @save="saveGroup"
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
import { SaveIcon } from 'lucide-vue-next';
import Button from '../ui/button.vue';
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
  if (!selectedItem.value) return;

  let currentFormData: Partial<Match> | Partial<Group> | null = null;

  // Get current data from the active form using refs
  if (selectedItem.value.type === 'match' && ruleFormRef.value) {
    currentFormData = ruleFormRef.value.getFormData();
  } else if (selectedItem.value.type === 'group' && groupFormRef.value) {
    currentFormData = groupFormRef.value.getFormData();
  }

  if (!currentFormData) {
    console.error('无法从表单组件获取当前数据!');
    alert('保存失败: 无法获取表单数据。');
    return;
  }

  try {
    if (selectedItem.value.type === 'match') {
      // Pass the fresh form data to saveRule
      await saveRule(selectedItem.value.id, currentFormData as Partial<Match>);
    } else if (selectedItem.value.type === 'group') {
      // Pass the fresh form data to saveGroup
      await saveGroup(selectedItem.value.id, currentFormData as Partial<Group>);
    }
  } catch (error: any) {
    console.error('保存项目失败 (saveItem): ', error);
    alert(`保存失败: ${error.message || '未知错误'}`);
  }
};

// 不再需要删除项目函数

// 保存规则 - Now receives the updated form data directly
const saveRule = async (id: string, updatedRuleData: Partial<Match> & { content?: string, contentType?: string }) => {
  try {
    // Map content/contentType back to specific Match fields
    const mappedFields = mapContentToMatchFields(updatedRuleData.content, updatedRuleData.contentType);

    // Create the cleaned object to merge into state
    const cleanedDataToMerge: Partial<Match> = {
      ...updatedRuleData,
      content: undefined,       // Ensure raw content is not merged
      contentType: undefined,   // Ensure raw contentType is not merged
      ...mappedFields,
      // Map specific keys
      left_word: updatedRuleData.leftWord,
      right_word: updatedRuleData.rightWord,
      propagate_case: updatedRuleData.propagateCase,
      uppercase_style: updatedRuleData.uppercaseStyle || undefined,
      force_mode: updatedRuleData.forceMode || undefined,
    };
    // Remove UI-specific keys before passing to store
    delete cleanedDataToMerge.leftWord;
    delete cleanedDataToMerge.rightWord;
    delete cleanedDataToMerge.propagateCase;
    delete cleanedDataToMerge.uppercaseStyle;
    delete cleanedDataToMerge.forceMode;

    // 1. Update state (mutates item in config and updates ref in configTree)
    store.updateConfigState(id, cleanedDataToMerge);

    // 2. Get the fully updated item from the state (needed for filePath)
    const itemToSave = store.findItemById(id);
    if (!itemToSave || itemToSave.type !== 'match') {
        throw new Error(`保存失败：无法在状态中找到ID为 ${id} 的规则。`);
    }

    // 3. Call the specific save action
    await store.saveItemToFile(itemToSave);

    alert('保存成功！'); // Show alert last

  } catch (error: any) {
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

// 保存分组 - Now receives the updated form data directly
const saveGroup = async (id: string, updatedGroupData: Partial<Group>) => {
  try {
    // Create the cleaned object to merge into state (Group has less mapping needed)
    const cleanedDataToMerge: Partial<Group> = { ...updatedGroupData };

    // 1. Update state (mutates item in config and updates ref in configTree)
    store.updateConfigState(id, cleanedDataToMerge);

    // 2. Get the fully updated item from the state (needed for filePath)
    const itemToSave = store.findItemById(id);
     if (!itemToSave || itemToSave.type !== 'group') {
        throw new Error(`保存失败：无法在状态中找到ID为 ${id} 的分组。`);
    }

    // 3. Call the specific save action
    await store.saveItemToFile(itemToSave);

    alert('保存成功！'); // Show alert last

  } catch (error: any) {
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
  store.deleteItem(id, 'match');
};

// 删除分组
const deleteGroup = (id: string) => {
  store.deleteItem(id, 'group');
};

// 处理保存事件
const handleSave = async (itemData: Match | Group) => {
  try {
    await store.updateItem(itemData);
    // 可选: 显示保存成功提示
    console.log('项目已更新');
    // 清除选中状态可能不是期望行为，因为用户可能想继续编辑
    // store.state.selectedItemId = null;
  } catch (error) {
    // Add type assertion for error
    console.error('更新项目失败:', error as any);
    // 显示错误提示
    alert(`保存失败: ${(error as any).message || error}`);
  }
};
</script>


