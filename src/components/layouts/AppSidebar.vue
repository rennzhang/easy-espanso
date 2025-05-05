<template>
  <div class="app-sidebar">
    <div class="sidebar-content">
      <div class="logo">
        <div class="logo-placeholder">E</div>
      </div>

      <nav class="nav-links">
        <RouterLink
          v-for="route in routes"
          :key="route.name"
          :to="route.path"
          class="nav-link"
          :class="{ active: currentRoute.path.startsWith(route.path) }"
        >
          <component :is="icons[route.meta.icon]" class="nav-icon" />
          <span class="nav-text">{{ route.meta.title }}</span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute, RouteRecordRaw } from 'vue-router';
import { ScissorsIcon, SettingsIcon } from 'lucide-vue-next';

const router = useRouter();
const currentRoute = useRoute();

// 图标映射
const icons = {
  Scissors: ScissorsIcon,
  Settings: SettingsIcon
};

// 获取需要在侧边栏显示的路由
const routes = computed(() => {
  return router.getRoutes()
    .filter(route => route.meta.icon) // 只显示有图标的路由
    .sort((a, b) => {
      // 自定义排序，确保片段在前，设置在后
      if (a.path === '/snippets') return -1;
      if (b.path === '/snippets') return 1;
      return 0;
    });
});
</script>

<style scoped>
.app-sidebar {
  width: 75px;
  height: 100%;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
}

.logo {
  margin-bottom: 24px;
  padding: 8px;
}

.logo-placeholder {
  width: 40px;
  height: 40px;
  background-color: #1a73e8;
  color: white;
  font-size: 24px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.nav-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.nav-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px 0;
  color: #666;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #333;
}

.nav-link.active {
  color: #1a73e8;
}

.nav-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
}

.nav-text {
  font-size: 12px;
  text-align: center;
}
</style>
