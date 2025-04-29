<template>
  <div
    :class="
      cn(
        'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
        alertVariants({ variant }),
        className
      )
    "
    role="alert"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const props = defineProps<{
  variant?: 'default' | 'destructive'
  class?: string
}>()

const className = computed(() => props.class ?? '')

const alertVariants = cva('border-muted/30 bg-background text-foreground', {
  variants: {
    variant: {
      default: 'border-muted/30 bg-background text-foreground',
      destructive:
        'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})
</script>
