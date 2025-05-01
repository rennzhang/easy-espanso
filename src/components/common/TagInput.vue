<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap gap-2">
      <Badge
        v-for="(tag, index) in modelValue"
        :key="index"
        variant="secondary"
        class="flex items-center gap-1"
      >
        {{ tag }}
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-4 w-4"
          @click="removeTag(index)"
        >
          <span class="sr-only">Remove</span>
          <XIcon class="h-3 w-3" />
        </button>
      </Badge>
    </div>

    <div class="flex gap-2">
      <Input
        v-model="newTag"
        @keydown.enter.prevent="addTag"
        :placeholder="placeholder"
        class="flex-1"
      />
      <Button @click="addTag" size="sm">添加</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { XIcon } from 'lucide-vue-next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

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
