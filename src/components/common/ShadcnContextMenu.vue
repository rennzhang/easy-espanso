<template>
  <ContextMenu>
    <ContextMenuTrigger>
      <slot name="trigger"></slot>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <template v-for="(item, index) in menuItems" :key="index">
        <ContextMenuItem
          v-if="!item.separator"
          :variant="item.destructive ? 'destructive' : 'default'"
          @select="handleItemSelect(item)"
        >
          <component v-if="item.icon" :is="item.icon" class="mr-2 h-4 w-4" />
          {{ item.label }}
        </ContextMenuItem>
        <ContextMenuSeparator v-else />
      </template>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
import type { FunctionalComponent, HTMLAttributes, VNodeProps } from 'vue';

export type ContextMenuItem = {
  label: string;
  action: () => void;
  icon?: FunctionalComponent<HTMLAttributes & VNodeProps>;
  destructive?: boolean;
  separator?: boolean;
} | {
  separator: true;
  label?: string;
  action?: () => void;
  icon?: FunctionalComponent<HTMLAttributes & VNodeProps>;
  destructive?: boolean;
}

const { menuItems } = defineProps<{
  menuItems: ContextMenuItem[];
}>();

const handleItemSelect = (item: ContextMenuItem) => {
  if ('action' in item && typeof item.action === 'function') {
    item.action();
  }
};
</script>
