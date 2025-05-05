import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RuleFormState } from '@/types/forms/rule-form.types';

export const useFormStore = defineStore('formStore', () => {
  // 存储每个规则ID对应的表单数据
  const formDataMap = ref<Map<string, RuleFormState>>(new Map());
  
  // 保存表单数据
  const saveFormData = (ruleId: string, formData: RuleFormState) => {
    formDataMap.value.set(ruleId, JSON.parse(JSON.stringify(formData)));
  };
  
  // 获取表单数据
  const getFormData = (ruleId: string): RuleFormState | null => {
    const data = formDataMap.value.get(ruleId);
    return data ? JSON.parse(JSON.stringify(data)) : null;
  };
  
  // 检查是否有保存的表单数据
  const hasFormData = (ruleId: string): boolean => {
    return formDataMap.value.has(ruleId);
  };
  
  // 删除表单数据
  const deleteFormData = (ruleId: string) => {
    formDataMap.value.delete(ruleId);
  };
  
  // 清空所有表单数据
  const clearAllFormData = () => {
    formDataMap.value.clear();
  };
  
  return {
    saveFormData,
    getFormData,
    hasFormData,
    deleteFormData,
    clearAllFormData
  };
});
