<template>
  <div class="space-y-1.5">
    <!-- Label and Help Tip -->
    <div class="flex items-center">
      <label v-if="label" :for="inputId" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mr-1">
        {{ label }}
      </label>
      <HelpTip v-if="helpContent" :content="helpContent" />
    </div>
    
    <!-- Input Control Slot -->
    <slot></slot>
    
    <!-- Description -->
    <p v-if="description" class="text-sm text-muted-foreground">
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import HelpTip from './HelpTip.vue';

// Define props
defineProps<{
  label?: string;
  description?: string;
  helpContent?: string;
  inputId?: string; // Optional ID to link label and input for accessibility
}>();
</script> 