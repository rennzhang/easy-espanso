<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: boolean
  class?: string
  [key: string]: any
}>()

const emit = defineEmits(['update:modelValue'])

const checked = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  checked.value = target.checked
}
</script>

<template>
  <div class="flex items-center space-x-2">
    <div class="relative">
      <input
        type="checkbox"
        :checked="checked"
        @change="handleChange"
        class="peer sr-only"
        v-bind="$attrs"
      />
      <div
        :class="
          cn(
            'h-4 w-4 rounded border border-primary ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
            props.class
          )
        "
        :data-state="checked ? 'checked' : 'unchecked'"
      >
        <CheckIcon v-if="checked" class="h-4 w-4 text-white" />
      </div>
    </div>
    <slot />
  </div>
</template>
