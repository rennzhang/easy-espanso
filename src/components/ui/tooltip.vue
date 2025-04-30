<template>
  <div class="relative inline-flex">
    <div
      @mouseenter="open = true"
      @mouseleave="open = false"
      @focus="open = true"
      @blur="open = false"
      class="inline-flex"
    >
      <slot />
    </div>
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="open"
        ref="tooltipRef"
        :class="cn(
          'z-50 absolute px-3 py-1.5 text-xs rounded-md shadow-md select-none whitespace-nowrap',
          'bg-background border border-border text-foreground',
          'animate-in fade-in-0 zoom-in-95',
          position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5' : '',
          position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-1.5' : '',
          position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-1.5' : '',
          position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-1.5' : '',
          className
        )"
      >
        {{ content }}
        <div
          :class="cn(
            'absolute w-2 h-2 rotate-45 bg-background border',
            position === 'top' ? 'border-r border-b -bottom-1 left-1/2 -translate-x-1/2' : '',
            position === 'bottom' ? 'border-l border-t -top-1 left-1/2 -translate-x-1/2' : '',
            position === 'left' ? 'border-t border-r -right-1 top-1/2 -translate-y-1/2' : '',
            position === 'right' ? 'border-b border-l -left-1 top-1/2 -translate-y-1/2' : ''
          )"
        ></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  class?: string
}>()

const className = computed(() => props.class ?? '')
const position = computed(() => props.position ?? 'top')
const open = ref(false)
const tooltipRef = ref<HTMLElement | null>(null)
</script>

<style scoped>
/* 确保提示框内的文本不会换行 */
.whitespace-nowrap {
  white-space: nowrap;
}
</style>
