<template>
  <div class="relative inline-block" ref="triggerRef">
    <slot name="trigger" :open="() => (isOpen = true)" :close="() => (isOpen = false)" :toggle="toggle"></slot>
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div
          v-if="isOpen"
          ref="popoverRef"
          class="fixed z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1"
          :style="popoverStyle"
        >
          <slot></slot>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';

const props = defineProps<{
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
  closeOnClickOutside?: boolean;
  modelValue?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const isOpen = ref(props.modelValue || false);
const popoverRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);

// 计算 popover 的位置
const popoverStyle = computed(() => {
  if (!triggerRef.value || !isOpen.value) return {};
  
  const triggerRect = triggerRef.value.getBoundingClientRect();
  const position = props.position || 'bottom';
  const align = props.align || 'center';
  
  let top = 0;
  let left = 0;
  
  // 根据位置计算 top 值
  if (position === 'top') {
    top = triggerRect.top - 10; // 在触发元素上方，留出一些间距
  } else if (position === 'bottom') {
    top = triggerRect.bottom + 10; // 在触发元素下方，留出一些间距
  } else if (position === 'left' || position === 'right') {
    top = triggerRect.top + triggerRect.height / 2; // 垂直居中
  }
  
  // 根据位置和对齐方式计算 left 值
  if (position === 'left') {
    left = triggerRect.left - 10; // 在触发元素左侧，留出一些间距
  } else if (position === 'right') {
    left = triggerRect.right + 10; // 在触发元素右侧，留出一些间距
  } else if (align === 'start') {
    left = triggerRect.left; // 左对齐
  } else if (align === 'end') {
    left = triggerRect.right; // 右对齐
  } else { // center
    left = triggerRect.left + triggerRect.width / 2; // 水平居中
  }
  
  // 根据位置调整 transform-origin
  let transformOrigin = 'center center';
  if (position === 'top') {
    transformOrigin = 'center bottom';
  } else if (position === 'bottom') {
    transformOrigin = 'center top';
  } else if (position === 'left') {
    transformOrigin = 'right center';
  } else if (position === 'right') {
    transformOrigin = 'left center';
  }
  
  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    transform: align === 'center' && (position === 'top' || position === 'bottom') ? 'translateX(-50%)' : '',
    transformOrigin,
  };
});

// 切换 popover 的显示状态
const toggle = () => {
  isOpen.value = !isOpen.value;
  emit('update:modelValue', isOpen.value);
};

// 处理点击外部关闭
const handleClickOutside = (event: MouseEvent) => {
  if (
    props.closeOnClickOutside &&
    isOpen.value &&
    popoverRef.value &&
    triggerRef.value &&
    !popoverRef.value.contains(event.target as Node) &&
    !triggerRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false;
    emit('update:modelValue', false);
  }
};

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  isOpen.value = newValue;
});

// 监听 isOpen 变化
watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue);
});

// 添加点击外部关闭事件
onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

// 移除点击外部关闭事件
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>
