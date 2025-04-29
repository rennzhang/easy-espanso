<template>
  <div class="flex flex-col h-screen overflow-hidden bg-background relative">
    <header class="h-16 bg-card border-b border-border flex items-center px-4 shadow-sm z-10">
      <div class="flex-1 flex items-center">
        <div class="font-bold text-xl text-primary flex items-center">
          <span v-if="!leftMenuCollapsed">Espanso GUI</span>
          <div v-else class="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center font-bold">E</div>
        </div>
      </div>
      <div class="flex-2 flex justify-center items-center">
        <h1 class="text-xl font-semibold text-foreground m-0">Espanso 配置管理工具</h1>
      </div>
      <div class="flex-1 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" @click="loadConfig">
          打开配置
        </Button>
        <Button size="sm" @click="saveConfig" :disabled="!config">
          保存配置
        </Button>
      </div>
    </header>

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
import { computed } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import LeftPane from '../panels/LeftPane.vue';
import MiddlePane from '../panels/MiddlePane.vue';
import RightPane from '../panels/RightPane.vue';
import Button from '../ui/button.vue';

const store = useEspansoStore();
const leftMenuCollapsed = computed(() => store.leftMenuCollapsed);
const loading = computed(() => store.loading);
const config = computed(() => store.config);

// 加载配置
const loadConfig = async () => {
  await store.loadConfig();
};

// 保存配置
const saveConfig = async () => {
  await store.saveConfig();
};
</script>

<style>
.left-collapsed .left-pane {
  width: 60px;
}
</style>
