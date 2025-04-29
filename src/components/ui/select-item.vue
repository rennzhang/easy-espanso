<script setup lang="ts">
import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-vue-next'

defineProps<{
  checked?: boolean
  class?: string
  value: string
}>()
</script>

<template>
  <div
    :class="
      cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        checked && 'bg-accent text-accent-foreground',
        $props.class
      )
    "
    :data-state="checked ? 'checked' : 'unchecked'"
  >
    <span v-if="checked" class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <CheckIcon class="h-4 w-4" />
    </span>
    <slot />
  </div>
</template>
