<template>
  <div class="main-layout">
    <header class="app-header">
      <div class="app-header-left">
        <div class="app-logo">
          <span class="logo-text" v-if="!leftMenuCollapsed">Espanso GUI</span>
          <span class="logo-icon" v-else>E</span>
        </div>
      </div>
      <div class="app-header-center">
        <h1 class="app-title">Espanso 配置管理工具</h1>
      </div>
      <div class="app-header-right">
        <button class="btn-secondary btn-sm" @click="loadConfig">
          打开配置
        </button>
        <button class="btn-primary btn-sm" @click="saveConfig" :disabled="!config">
          保存配置
        </button>
      </div>
    </header>

    <div class="layout-container" :class="{ 'left-collapsed': leftMenuCollapsed }">
      <LeftPane class="left-pane" />
      <MiddlePane class="middle-pane" />
      <RightPane class="right-pane" />
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading"></div>
      <div class="loading-text">加载中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import LeftPane from '../panels/LeftPane.vue';
import MiddlePane from '../panels/MiddlePane.vue';
import RightPane from '../panels/RightPane.vue';

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
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: var(--background-light-color);
  position: relative;
}

.app-header {
  height: 60px;
  background-color: white;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-4);
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.app-header-left, .app-header-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.app-header-center {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
}

.app-header-right {
  justify-content: flex-end;
  gap: var(--spacing-2);
}

.app-logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--primary-color);
  display: flex;
  align-items: center;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background-color: var(--primary-color);
  color: white;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.layout-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  background-color: white;
  box-shadow: var(--shadow);
  margin: var(--spacing-4);
  border-radius: var(--radius-lg);
}

.left-pane {
  width: 250px;
  transition: width var(--transition) ease;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  background-color: var(--background-light-color);
  border-top-left-radius: var(--radius-lg);
  border-bottom-left-radius: var(--radius-lg);
}

.left-collapsed .left-pane {
  width: 60px;
}

.middle-pane {
  width: 350px;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  background-color: white;
}

.right-pane {
  flex: 1;
  overflow-y: auto;
  background-color: white;
  border-top-right-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
}
</style>
