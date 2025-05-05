<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-content">
      <RouterView v-slot="{ Component, route }">
        <template v-if="Component">
          <Suspense>
            <template #default>
              <div class="component-wrapper">
                <div v-if="error" class="error-view">
                  <h3 class="error-title">页面加载出错</h3>
                  <p>{{ error.message || '组件出现未知错误' }}</p>
                  <Button @click="navigateToHome" class="mt-4">返回首页</Button>
                </div>
                <component v-else :is="Component" :key="route.path" />
              </div>
            </template>
            <template #fallback>
              <div class="loading-view">
                <div class="spinner"></div>
                <p>加载页面中...</p>
              </div>
            </template>
          </Suspense>
        </template>
        <template v-else>
          <div class="error-view">
            <p>无法加载页面：{{ route.path }}</p>
            <Button @click="navigateToHome" class="mt-4">返回首页</Button>
          </div>
        </template>
      </RouterView>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './AppSidebar.vue';
import { onMounted, onErrorCaptured, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '../ui/button';

const router = useRouter();
const error = ref<Error | null>(null);

onMounted(() => {
  console.log('AppLayout 已挂载');
});

// 导航到首页方法
const navigateToHome = () => {
  error.value = null; // 重置错误状态
  router.push('/snippets').catch(err => {
    console.error('导航到首页失败:', err);
    // 直接修改URL作为备选
    window.location.hash = '#/snippets';
  });
};

// 捕获组件错误
onErrorCaptured((err, instance, info) => {
  console.error('AppLayout 捕获到错误:', err);
  error.value = err;
  return false; // 阻止错误继续传播
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.component-wrapper {
  height: 100%;
  width: 100%;
}

.loading-view, .error-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.error-view {
  color: #e53e3e;
  max-width: 80%;
  margin: 0 auto;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3182ce;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
