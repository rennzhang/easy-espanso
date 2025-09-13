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
          @click.prevent="handleNavClick(route)"
        >
          <component :is="getRouteIcon(route)" class="nav-icon" />
          <span class="nav-text">{{ t(route.meta.title as string) }}</span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute, RouteRecordNormalized } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ScissorsIcon, SettingsIcon } from 'lucide-vue-next';
import type { FunctionalComponent } from 'vue';

// 初始化国际化
const { t } = useI18n();

// // 调试日志：检查 t 函数和 locale
// console.log('[AppSidebar] i18n initialized:', { t: typeof t, locale: locale.value });
// console.log('[AppSidebar] Testing t function with key sidebar.settings:', t('sidebar.settings'));

const router = useRouter();
const currentRoute = useRoute();
const isNavigating = ref(false);

// 图标映射
const icons: Record<string, FunctionalComponent> = {
  Scissors: ScissorsIcon,
  Settings: SettingsIcon
};

// 获取需要在侧边栏显示的路由
const routes = computed(() => {
  const allRoutes = router.getRoutes();
  return allRoutes
    .filter(route => route.meta.icon) // 只显示有图标的路由
    .sort((a, b) => {
      // 自定义排序，确保片段在前，设置在后
      if (a.path === '/snippets') return -1;
      if (b.path === '/snippets') return 1;
      return 0;
    });
});

// 使用防抖处理导航点击，防止快速多次点击
let navTimeout: number | null = null;
const handleNavClick = (route: RouteRecordNormalized) => {
  // 防止短时间内重复点击
  if (isNavigating.value) {
    console.log('[AppSidebar] 导航进行中，忽略点击');
    return;
  }

  // 如果当前已经在该路由，不做任何操作
  if (currentRoute.path === route.path) {
    console.log(`[AppSidebar] 已经在路由 ${route.path} 上，忽略导航`);
    return;
  }
  
  console.log('[AppSidebar] 导航点击:', route.path, route.name);
  
  // 防抖，避免快速点击
  if (navTimeout) {
    clearTimeout(navTimeout);
  }
  
  isNavigating.value = true;
  
  // 短延迟后执行导航，合并快速的多次点击
  navTimeout = window.setTimeout(() => {
    // 使用编程式导航确保路由跳转
    navigateWithFallback(route.path);
    isNavigating.value = false;
    navTimeout = null;
  }, 100);
};

// 添加具有错误处理的导航方法
const navigateWithFallback = (path: string) => {
  console.log('[AppSidebar] 开始导航到:', path);
  
  try {
    // 主要导航方法
    router.push(path).catch(error => {
      console.error('[AppSidebar] 主要导航失败:', error);
      
      // 尝试替代方法1: replace
      if (!error.message || !error.message.includes('Avoided redundant navigation')) {
        console.log('[AppSidebar] 尝试使用 replace 方法');
        router.replace(path).catch(e => {
          console.error('[AppSidebar] 替代导航也失败:', e);
          fallbackNavigation(path);
        });
      }
    });
  } catch (err) {
    console.error('[AppSidebar] 导航过程中发生异常:', err);
    fallbackNavigation(path);
  }
};

// 最后的备选导航方法
const fallbackNavigation = (path: string) => {
  console.log('[AppSidebar] 使用备选导航方法');
  // 直接修改URL哈希
  if (typeof window !== 'undefined') {
    try {
      console.log('[AppSidebar] 直接修改 URL hash');
      window.location.hash = path;
    } catch (err) {
      console.error('[AppSidebar] 修改 URL 失败:', err);
    }
  }
};

// 添加函数获取图标
const getRouteIcon = (route: RouteRecordNormalized) => {
  // 获取路由元数据中的图标名称，并从icons映射中获取对应组件
  const iconName = route.meta.icon as string;
  return icons[iconName] || null;
};
</script>

<style scoped>
.app-sidebar {
  width: 75px;
  height: 100%;
  background-color: hsl(var(--muted) / 0.8);
  border-right-width: 1px;
  border-color: hsl(var(--border));
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
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  font-size: 24px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.nav-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px; /* 减小间距更紧凑 */
  width: 100%;
}

.nav-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 0;
  color: hsl(var(--muted-foreground));
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.nav-link:hover {
  color: hsl(var(--foreground));
  background-color: hsl(var(--accent) / 0.8);
}

.nav-link.active {
  color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.05);
  font-weight: 500;
}

.nav-link.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  height: 100%;
  background-color: hsl(var(--primary));
  transition: all 0.2s ease;
}

.nav-icon {
  width: 22px;
  height: 22px;
  margin-bottom: 4px;
}

.nav-text {
  font-size: 11px;
  text-align: center;
  font-weight: 500;
}
</style>
