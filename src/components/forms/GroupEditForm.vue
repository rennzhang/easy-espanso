<template>
  <UForm :state="formState" @submit="onSubmit" class="group-form">
    <UFormGroup label="分组名称" name="name">
      <UInput 
        v-model="formState.name" 
        placeholder="例如: 常用短语"
        required
      />
      <template #hint>
        输入分组名称，用于标识和组织规则
      </template>
    </UFormGroup>

    <UFormGroup label="描述" name="label">
      <UInput 
        v-model="formState.label" 
        placeholder="可选的分组描述"
      />
      <template #hint>
        为分组添加简短描述，方便识别和管理
      </template>
    </UFormGroup>

    <UFormGroup label="公共前缀" name="prefix">
      <UInput 
        v-model="formState.prefix" 
        placeholder="例如: :common"
      />
      <template #hint>
        可选，将作为该分组内所有规则的前缀
      </template>
    </UFormGroup>

    <div class="flex gap-2 mt-6">
      <UButton type="submit" color="primary">保存</UButton>
      <UButton type="button" color="gray" @click="onCancel">取消</UButton>
      <UButton type="button" color="red" variant="soft" @click="onDelete" class="ml-auto">删除</UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EspansoGroup } from '../../types/espanso-config';

// 定义props
const props = defineProps<{
  group: EspansoGroup
}>();

// 定义事件
const emit = defineEmits<{
  save: [id: string, updatedGroup: Partial<EspansoGroup>]
  cancel: []
  delete: [id: string]
}>();

// 表单状态类型，使其与EspansoGroup兼容
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

// 初始化表单
onMounted(() => {
  // 深拷贝props.group到formState
  const groupData = JSON.parse(JSON.stringify(props.group));
  formState.value = {
    name: groupData.name || '',
    label: groupData.label || '',
    prefix: groupData.prefix || ''
  };
});

// 监听props变化
watch(() => props.group, (newGroup) => {
  const groupData = JSON.parse(JSON.stringify(newGroup));
  formState.value = {
    name: groupData.name || '',
    label: groupData.label || '',
    prefix: groupData.prefix || ''
  };
}, { deep: true });

// 提交表单
const onSubmit = () => {
  // 表单验证由Nuxt UI处理
  emit('save', props.group.id, formState.value);
};

// 取消编辑
const onCancel = () => {
  emit('cancel');
};

// 删除分组
const onDelete = () => {
  if (confirm('确定要删除这个分组吗？这将同时删除分组内的所有规则和子分组！')) {
    emit('delete', props.group.id);
  }
};
</script>

<style scoped>
.group-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
