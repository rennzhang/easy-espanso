<template>
  <div class="app-container">
    <MainLayout />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useEspansoStore } from './store/useEspansoStore';
import MainLayout from './components/layout/MainLayout.vue';

const store = useEspansoStore();

// 在组件挂载后尝试加载配置
onMounted(async () => {
  // 这里可以尝试加载上次使用的配置文件路径
  // 暂时不执行实际加载，等待用户点击"打开配置"按钮
  // await store.loadConfig();
});
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
