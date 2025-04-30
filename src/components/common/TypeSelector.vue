<template>
  <div class="type-selector">
    <div class="flex items-center space-x-2">
      <select
        v-model="selectedType"
        class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// 定义选项类型
interface TypeOption {
  label: string;
  value: string;
}

// 定义 props
const props = defineProps<{
  modelValue: string;
  options: TypeOption[];
}>();

// 定义 emits
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// 计算属性：选中的类型
const selectedType = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});
</script>
