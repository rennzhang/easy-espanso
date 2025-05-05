<script setup lang="ts">
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical';
  class?: HTMLAttributes['class'];
}>(), {
  orientation: 'horizontal'
});
</script>

<template>
  <div
    data-slot="separator"
    :data-orientation="orientation"
    :class="cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      props.class
    )"
    role="separator"
  />
</template> 