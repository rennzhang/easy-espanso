<template>
  <div class="tag-input-container">
    <div class="tags-display">
      <div v-for="(tag, index) in modelValue" :key="index" class="tag">
        {{ tag }}
        <button type="button" class="remove-tag" @click="removeTag(index)">&times;</button>
      </div>
    </div>
    
    <div class="input-container">
      <input 
        type="text" 
        v-model="newTag" 
        @keydown.enter.prevent="addTag"
        :placeholder="placeholder"
        class="tag-input"
      />
      <button type="button" class="add-tag" @click="addTag">添加</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 定义props
const props = defineProps<{
  modelValue: string[]
  placeholder?: string
}>();

// 定义事件
const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>();

// 新标签输入
const newTag = ref('');

// 添加标签
const addTag = () => {
  if (newTag.value.trim()) {
    const updatedTags = [...props.modelValue];
    
    // 检查标签是否已存在
    if (!updatedTags.includes(newTag.value.trim())) {
      updatedTags.push(newTag.value.trim());
      emit('update:modelValue', updatedTags);
    }
    
    newTag.value = '';
  }
};

// 移除标签
const removeTag = (index: number) => {
  const updatedTags = [...props.modelValue];
  updatedTags.splice(index, 1);
  emit('update:modelValue', updatedTags);
};
</script>

<style>
.tag-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: #e5e7eb;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.remove-tag {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  color: #6b7280;
}

.input-container {
  display: flex;
  gap: 0.5rem;
}

.tag-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

.add-tag {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
</style>
