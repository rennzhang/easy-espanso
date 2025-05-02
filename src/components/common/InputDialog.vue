<template>
  <Dialog :open="visible" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label :for="inputId" class="text-right">
            {{ label }}
          </Label>
          <Input
            :id="inputId"
            v-model="inputValue"
            :placeholder="placeholder"
            class="col-span-3"
            @keyup.enter="handleSubmit"
            ref="inputRef"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="handleCancel">
          取消
        </Button>
        <Button type="submit" @click="handleSubmit">
          确认
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps<{
  visible: boolean;
  title: string;
  description?: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  submit: [value: string];
  cancel: [];
  'update:visible': [value: boolean];
}>();

const inputValue = ref(props.initialValue || '');
const inputRef = ref<HTMLInputElement | null>(null);
const inputId = `input-${Math.random().toString(36).substring(7)}`;

watch(() => props.visible, (newVal) => {
  if (newVal) {
    inputValue.value = props.initialValue || '';
    // DOM 更新后聚焦输入框
    nextTick(() => {
      inputRef.value?.focus();
    });
  } else {
    inputValue.value = ''; // 关闭时清空
  }
});

const handleOpenChange = (open: boolean) => {
  emit('update:visible', open);
  if (!open) {
    emit('cancel'); // 如果通过点击外部或关闭按钮关闭，也触发cancel
  }
};

const handleSubmit = () => {
  if (inputValue.value.trim()) {
    emit('submit', inputValue.value.trim());
    emit('update:visible', false);
  }
  // 可以添加验证逻辑或提示
};

const handleCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};
</script> 