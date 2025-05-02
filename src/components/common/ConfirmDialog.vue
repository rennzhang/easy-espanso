<template>
  <Dialog :open="visible" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <p class="text-sm text-muted-foreground">
          {{ message }}
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="handleCancel">
          {{ cancelText }}
        </Button>
        <Button type="submit" :variant="confirmVariant" @click="handleConfirm">
          {{ confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const props = defineProps<{
  visible: boolean;
  title: string;
  description?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive';
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  'update:visible': [value: boolean];
}>();

// 设置默认值
const confirmText = props.confirmText || '确认';
const cancelText = props.cancelText || '取消';
const confirmVariant = props.confirmVariant || 'destructive';

const handleOpenChange = (open: boolean) => {
  emit('update:visible', open);
  if (!open) {
    emit('cancel'); // 如果通过点击外部或关闭按钮关闭，也触发cancel
  }
};

const handleConfirm = () => {
  emit('confirm');
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};
</script> 