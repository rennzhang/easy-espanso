<template>
  <div class="not-found-view">
    <h1>404</h1>
    <p>页面不存在</p>
    <Button @click="router.push('/')">返回首页</Button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';

const router = useRouter();
</script>

<style scoped>
.not-found-view {
  padding: 20px;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  @apply bg-background text-foreground;
}

h1 {
  font-size: 4rem;
  margin: 0;
  @apply text-muted-foreground;
}

p {
  @apply text-lg text-muted-foreground;
}
</style>
