<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="contextMenuRef"
      class="context-menu fixed z-[9999] min-w-[180px] rounded-md border bg-card p-1 shadow-lg"
      :style="{ top: `${position.y}px`, left: `${position.x}px` }"
    >
      <ul class="flex flex-col gap-1">
        <li
          v-for="(item, index) in menuItems"
          :key="index"
          class="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          :class="{ 'text-destructive hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground': item.destructive }"
          @click="() => handleItemClick(item)"
        >
          <component v-if="item.icon" :is="item.icon" class="mr-2 h-4 w-4" />
          {{ item.label }}
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { FunctionalComponent, HTMLAttributes, VNodeProps } from 'vue';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: FunctionalComponent<HTMLAttributes & VNodeProps>;
  destructive?: boolean; // 用于标记危险操作，如删除
}

export interface Position {
  x: number;
  y: number;
}

// 使用解构来确保 props 被使用
const { visible, position, menuItems } = defineProps<{
  visible: boolean;
  position: Position;
  menuItems: ContextMenuItem[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const contextMenuRef = ref<HTMLDivElement | null>(null);

const handleItemClick = (item: ContextMenuItem) => {
  item.action();
  emit('close');
};

const handleClickOutside = (event: MouseEvent) => {
  if (contextMenuRef.value && !contextMenuRef.value.contains(event.target as Node)) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
/* 右键菜单样式增强 */
.context-menu {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border);
}
</style>