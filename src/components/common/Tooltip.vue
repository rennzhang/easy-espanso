<template>
  <div
    class="relative inline-flex items-center"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <slot />
    <div
      class="absolute z-50 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-md whitespace-nowrap opacity-0 invisible transition-opacity duration-200 pointer-events-none"
      :class="[
        position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-1' : '',
        position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-1' : '',
        position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-1' : '',
        position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-1' : '',
        showTooltip ? 'opacity-100 visible' : ''
      ]"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}>();

// 默认位置为顶部
const position = props.position || 'top';

// 控制 tooltip 显示状态
const showTooltip = ref(false);
</script>
