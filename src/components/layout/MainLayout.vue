<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <!-- 左侧固定宽度导航栏 -->
    <div class="w-16 flex-shrink-0 h-full">
      <LeftPane />
    </div>

    <!-- 主内容区域 -->
    <div class="flex flex-1 overflow-hidden bg-card shadow my-4 mr-4 rounded-lg">
      <MiddlePane class="w-[350px] overflow-y-auto border-r border-border bg-card rounded-l-lg" />
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
import { ref } from 'vue';
import LeftPane from '../panels/LeftPane.vue';
import MiddlePane from '../panels/MiddlePane.vue';
import RightPane from '../panels/RightPane.vue';

// 加载状态
const loading = ref(false);
</script>

<style>
/* 移除未使用的样式 */
</style>
