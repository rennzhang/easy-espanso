<template>
  <textarea
    class="flex min-h-[80px] w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gray-500 focus:shadow-lg transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
