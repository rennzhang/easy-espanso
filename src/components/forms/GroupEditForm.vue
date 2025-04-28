<template>
  <form @submit.prevent="onSubmit" class="group-form">
    <div class="form-group">
      <label for="name">分组名称</label>
      <input 
        id="name" 
        v-model="formState.name" 
        type="text" 
        placeholder="例如: 常用短语"
        required
      />
    </div>
    
    <div class="form-group">
      <label for="prefix">公共前缀</label>
      <input 
        id="prefix" 
        v-model="formState.prefix" 
        type="text" 
        placeholder="例如: :common"
      />
      <small>可选，将作为该分组内所有规则的前缀</small>
    </div>
    
    <div class="form-actions">
      <button type="submit" class="btn-primary">保存</button>
      <button type="button" class="btn-secondary" @click="onCancel">取消</button>
      <button type="button" class="btn-danger" @click="onDelete">删除</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EspansoGroup } from '../../types/espanzo-config';

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

// 表单状态
const formState = ref<Partial<EspansoGroup>>({});

// 初始化表单
onMounted(() => {
  // 深拷贝props.group到formState
  formState.value = JSON.parse(JSON.stringify(props.group));
});

// 监听props变化
watch(() => props.group, (newGroup) => {
  formState.value = JSON.parse(JSON.stringify(newGroup));
}, { deep: true });

// 提交表单
const onSubmit = () => {
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

<style>
.group-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
}

.form-group small {
  color: #6b7280;
  font-size: 0.875rem;
}

.form-group input[type="text"] {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.btn-secondary {
  background-color: #9ca3af;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
</style>
