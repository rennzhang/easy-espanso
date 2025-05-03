<template>
  <div :class="['main-layout', 'flex', 'h-screen', 'overflow-hidden', 'bg-main-bg']">
    <!-- 左侧固定宽度导航栏 -->
    <div class="w-[75px] flex-shrink-0 h-full">
      <LeftPane />
    </div>

    <!-- Main Content Area -->
    <!-- Revert to static class temporarily -->
    <!-- TODO: Restore dynamic class binding based on platform and fullscreen state once store issues are resolved -->
    <!-- MiddlePane and RightPane now use bg-card for their own background, inherited from theme -->
    <div class="main-content-area flex flex-1 overflow-hidden">
      <MiddlePane 
        ref="middlePaneRef" 
        class="w-[350px] overflow-y-auto border-r border-border-color bg-main-bg" 
      />
      <RightPane 
        ref="rightPaneRef" 
        class="flex-1 overflow-y-auto bg-card" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// Remove store import if only used for dynamic padding
// import { useEspansoStore } from '../../store/useEspansoStore';
import { ref, onMounted } from 'vue';
import LeftPane from '../panels/LeftPane.vue';
import MiddlePane from '../panels/MiddlePane.vue';
import RightPane from '../panels/RightPane.vue';

// 引用组件实例
const middlePaneRef = ref<InstanceType<typeof MiddlePane> | null>(null);
const rightPaneRef = ref<InstanceType<typeof RightPane> | null>(null);

// 在组件挂载后建立引用关系
onMounted(() => {
  // 将中间面板引用传递给右侧面板
  if (rightPaneRef.value && middlePaneRef.value) {
    // @ts-ignore 临时忽略类型错误，实际使用时需要调整类型定义
    rightPaneRef.value.middlePaneRef = middlePaneRef.value;
  }
});
</script>

<style scoped>
.main-layout {
  /* 全局布局样式 */
  position: relative;
}

.main-content-area {
  /* 为标题栏留出空间 */
  position: relative;
  /* Apply static padding for macOS temporarily */
  /* TODO: Make this padding conditional based on platform and fullscreen state */
  padding-top: 28px; /* Adjust based on actual native title bar height */
}

/* 在 macOS 上应用特定样式 */
/* Keep or remove these media queries based on whether you need specific OS padding */
@media screen and (min-width: 768px) { 
  .main-content-area {
    padding-top: 28px; /* macOS 标题栏高度 */
  }
}

/* 在 Windows/Linux 上应用特定样式 */
@media screen and (max-width: 767px) {
  .main-content-area {
    padding-top: 32px; /* Windows/Linux 标题栏高度 */
  }
}

/* 拖拽区域，用于在无边框窗口中移动窗口 */
.main-layout::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 28px; /* 与标题栏高度一致 */
  -webkit-app-region: drag; /* 允许拖拽窗口 */
  z-index: 1000;
}

/* Remove dynamic padding class definition if no longer used */
/*
.pt-\[36px\] {
    padding-top: 36px;
}
*/
</style>
