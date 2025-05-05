<template>
  <div class="snippets-view">
    <MainLayout />
  </div>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue';
</script>

<style scoped>
.snippets-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
