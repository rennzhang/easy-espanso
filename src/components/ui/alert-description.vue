<template>
  <div :class="cn('text-sm [&_p]:leading-relaxed', className)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string
}>()

const className = computed(() => props.class ?? '')
</script>
