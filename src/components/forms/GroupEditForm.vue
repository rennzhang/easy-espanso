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

    <div class="flex gap-2 mt-6">
      <Button type="submit">保存</Button>
      <Button type="button" variant="outline" @click="onCancel">取消</Button>
      <Button type="button" variant="destructive" @click="onDelete" class="ml-auto">删除</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EspansoGroup } from '../../types/espanso-config';
import Button from '../ui/button.vue';
import Input from '../ui/input.vue';

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
  if (!formState.value.name) {
    return; // 简单验证
  }
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
