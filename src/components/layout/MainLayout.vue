<template>
  <div class="flex flex-col h-screen overflow-hidden bg-background relative">
    <div class="flex flex-1 overflow-hidden bg-card shadow m-4 rounded-lg" :class="{ 'left-collapsed': leftMenuCollapsed }">
      <LeftPane class="w-[250px] transition-[width] duration-300 ease-in-out overflow-y-auto border-r border-border bg-muted rounded-l-lg left-pane" />
      <MiddlePane class="w-[350px] overflow-y-auto border-r border-border bg-card" />
      <RightPane class="flex-1 overflow-y-auto bg-card rounded-r-lg" />
    </div>

    <div v-if="loading" class="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <div class="mt-4 text-primary font-medium">加载中...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import LeftPane from '../panels/LeftPane.vue';
import MiddlePane from '../panels/MiddlePane.vue';
import RightPane from '../panels/RightPane.vue';

const store = useEspansoStore();
const leftMenuCollapsed = computed(() => store.state.leftMenuCollapsed);
const loading = ref(false);
</script>

<style>
.left-collapsed .left-pane {
  width: 60px;
}
</style>
