<template>
  <form @submit.prevent="onSubmit" class="space-y-6">
    <div class="space-y-2">
      <label for="name" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        分组名称
      </label>
      <Input
        id="name"
        v-model="formState.name"
        placeholder="例如: 常用短语"
        required
      />
      <p class="text-sm text-muted-foreground">
        输入分组名称，用于标识和组织规则
      </p>
    </div>

    <div class="space-y-2">
      <label for="label" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        描述
      </label>
      <Input
        id="label"
        v-model="formState.label"
        placeholder="可选的分组描述"
      />
      <p class="text-sm text-muted-foreground">
        为分组添加简短描述，方便识别和管理
      </p>
    </div>

    <div class="space-y-2">
      <label for="prefix" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        公共前缀
      </label>
      <Input
        id="prefix"
        v-model="formState.prefix"
        placeholder="例如: :common"
      />
      <p class="text-sm text-muted-foreground">
        可选，将作为该分组内所有规则的前缀
      </p>
    </div>

    <!-- 不再需要底部保存按钮 -->
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { Group } from '../../types/espanso';
import { Transition } from 'vue';

// 获取 store
const store = useEspansoStore();

// 定义props
const props = defineProps<{
  group: Group
}>();

// 定义事件
const emit = defineEmits<{
  save: [id: string, updatedGroup: Partial<Group>]
  cancel: []
  delete: [id: string]
}>();

// 表单状态类型，使其与Group兼容
interface GroupFormState {
  name: string;
  label?: string;
  prefix?: string;
}

// 表单状态
const formState = ref<GroupFormState>({
  name: '',
  label: '',
  prefix: ''
});

// 表单是否已修改
const isFormModified = ref(false);
// 原始表单数据，用于比较是否有修改
const originalFormData = ref('');

// 初始化表单
onMounted(() => {
  // 深拷贝props.group到formState
  const groupData = JSON.parse(JSON.stringify(props.group));
  formState.value = {
    name: groupData.name || '',
    label: groupData.label || '',
    prefix: groupData.prefix || ''
  };

  // 保存原始表单数据，用于比较是否有修改
  originalFormData.value = JSON.stringify(formState.value);

  // 重置表单修改状态
  isFormModified.value = false;

  // 更新 store 中的表单修改状态
  store.state.hasUnsavedChanges = false;
});

// 监听props变化
watch(() => props.group, (newGroup) => {
  const groupData = JSON.parse(JSON.stringify(newGroup));
  formState.value = {
    name: groupData.name || '',
    label: groupData.label || '',
    prefix: groupData.prefix || ''
  };

  // 保存原始表单数据，用于比较是否有修改
  originalFormData.value = JSON.stringify(formState.value);

  // 重置表单修改状态
  isFormModified.value = false;

  // 更新 store 中的表单修改状态
  store.state.hasUnsavedChanges = false;
}, { deep: true });

// 监听表单变化
watch(formState, () => {
  checkFormModified();
}, { deep: true });

// 检查表单是否被修改
const checkFormModified = () => {
  const currentFormData = JSON.stringify(formState.value);
  isFormModified.value = currentFormData !== originalFormData.value;
  store.state.hasUnsavedChanges = isFormModified.value;
};

// 提交表单
const onSubmit = () => {
  if (!formState.value.name) {
    return; // 简单验证
  }

  // 保存后更新原始表单数据
  originalFormData.value = JSON.stringify(formState.value);
  isFormModified.value = false;
  store.state.hasUnsavedChanges = false;

  emit('save', props.group.id, formState.value);
};

// 取消编辑
const onCancel = () => {
  // 如果表单已修改，提示用户
  if (isFormModified.value) {
    if (confirm('您有未保存的修改，确定要放弃这些修改吗？')) {
      // 重置表单状态
      isFormModified.value = false;
      store.state.hasUnsavedChanges = false;
      emit('cancel');
    }
  } else {
    emit('cancel');
  }
};

// 组件卸载前检查未保存的修改
onBeforeUnmount(() => {
  // 确保组件卸载时重置全局状态
  store.state.hasUnsavedChanges = false;
});

// Expose only the method to get the current form data
defineExpose({
  getFormData: () => formState.value
});
</script>
