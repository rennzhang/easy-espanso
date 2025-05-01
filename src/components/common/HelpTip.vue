<template>
  <TooltipProvider :delay-duration="100">
    <Tooltip>
      <TooltipTrigger as-child>
        <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help ml-1" />
      </TooltipTrigger>
      <TooltipContent>
        <p>{{ content }}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircleIcon } from 'lucide-vue-next';

defineProps<{
  content: string;
}>();
</script> 