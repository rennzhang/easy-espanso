<template>
  <div class="error-boundary">
    <template v-if="errorCaptured">
      <div class="error-display">
        <h3 class="error-title">页面加载出错</h3>
        <p class="error-message">{{ errorMessage }}</p>
        <div class="error-actions">
          <button class="retry-button" @click="retry">重试</button>
          <button class="home-button" @click="navigateHome">返回首页</button>
        </div>
      </div>
    </template>
    <template v-else>
      <slot></slot>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, h } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const errorCaptured = ref(false);
const errorMessage = ref('');
const errorInstance = ref<Error | null>(null);

// 捕获子组件的错误
onErrorCaptured((err, instance, info) => {
  console.error('ErrorBoundary 捕获到错误:', err, info);
  errorCaptured.value = true;
  errorInstance.value = err;
  errorMessage.value = err.message || '组件加载出错';
  return false; // 阻止错误继续传播
});

// 重试加载组件
const retry = () => {
  errorCaptured.value = false;
  errorMessage.value = '';
  errorInstance.value = null;
};

// 导航到首页
const navigateHome = () => {
  router.push('/snippets').catch(() => {
    // 使用备选方法导航
    window.location.hash = '#/snippets';
  });
};
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1.5rem;
  text-align: center;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  @apply text-destructive;
  margin-bottom: 1rem;
}

.error-message {
  @apply text-muted-foreground;
  margin-bottom: 1.5rem;
  max-width: 500px;
}

.error-actions {
  display: flex;
  gap: 1rem;
}

.retry-button, .home-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-button {
  @apply bg-primary text-primary-foreground;
  border: none;
}

.retry-button:hover {
  @apply bg-primary/90;
}

.home-button {
  @apply bg-secondary text-secondary-foreground;
  border: none;
}

.home-button:hover {
  @apply bg-secondary/80;
}
</style> 