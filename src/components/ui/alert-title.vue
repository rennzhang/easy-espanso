<template>
  <h5 :class="cn('mb-1 font-medium leading-none tracking-tight', className)">
    <slot />
  </h5>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string
}>()

const className = computed(() => props.class ?? '')
</script>
