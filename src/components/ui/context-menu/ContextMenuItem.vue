<script setup lang="ts">
import { cn } from '@/lib/utils'
import {
  ContextMenuItem,
  type ContextMenuItemEmits,
  type ContextMenuItemProps,
  useForwardPropsEmits,
} from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = withDefaults(defineProps<ContextMenuItemProps & {
  class?: HTMLAttributes['class']
  inset?: boolean
  variant?: 'default' | 'destructive'
}>(), {
  variant: 'default',
})
const emits = defineEmits<ContextMenuItemEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ContextMenuItem
    data-slot="context-menu-item"
    :data-inset="inset ? '' : undefined"
    :data-variant="variant"
    v-bind="forwarded"
    :class="cn(
      `focus:bg-accent focus:text-accent-foreground 
      data-[variant=destructive]:hover:bg-destructive/80
      data-[variant=destructive]:hover:text-gray-800
      dark:data-[variant=destructive]:hover:bg-destructive/80
      dark:data-[variant=destructive]:hover:text-gray-800
      data-[variant=destructive]:focus:bg-destructive/80
      data-[variant=destructive]:focus:text-gray-800
      data-[variant=destructive]:*:[svg]:!text-gray-800
      data-[variant=destructive]:hover:*:[svg]:!text-gray-800
      [&_svg:not([class*='text-'])]:text-muted-foreground 
      relative flex cursor-default items-center gap-2 rounded-none px-2 py-1.5 text-sm  hover:!outline-none outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer`,
      props.class,
    )"
  >
    <slot />
  </ContextMenuItem>
</template>
