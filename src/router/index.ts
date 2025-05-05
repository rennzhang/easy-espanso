import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import i18n from '../i18n'; // 导入i18n实例

// 导入视图组件
// 使用动态导入避免预加载问题
const SnippetsView = () => import('../views/SnippetsView.vue');
const SettingsView = () => import('../views/SettingsView.vue');
const NotFoundView = () => import('../views/NotFoundView.vue');

// 路由导航防抖和循环检测
let lastNavigationTime = 0;
let navigationCount = 0;
let lastNavigationPath = '';
const NAVIGATION_THROTTLE = 500; // 毫秒
const MAX_NAVIGATION_COUNT = 3; // 短时间内允许的最大导航次数

// 定义路由
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/snippets'
  },
  {
    path: '/snippets',
    name: 'snippets',
    component: SnippetsView,
    meta: {
      title: 'sidebar.snippets',
      icon: 'Scissors'
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: {
      title: 'sidebar.settings',
      icon: 'Settings'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      title: 'common.pageNotFound'
    }
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// 防止路由无限循环
router.beforeEach((to, from, next) => {
  // 记录当前时间
  const now = Date.now();
  const timeGap = now - lastNavigationTime;
  console.log(`路由导航: ${from.path} -> ${to.path}, 时间间隔: ${timeGap}ms`);
  
  // 重置计数器（如果已经过了足够时间或路径不同）
  if (timeGap > NAVIGATION_THROTTLE || to.path !== lastNavigationPath) {
    navigationCount = 0;
    lastNavigationPath = to.path;
  }
  
  // 增加导航计数
  navigationCount++;
  
  // 检查循环导航
  if (navigationCount > MAX_NAVIGATION_COUNT && to.path === from.path && timeGap < NAVIGATION_THROTTLE) {
    console.error('检测到路由循环，强制终止导航循环');
    navigationCount = 0;
    
    // 如果正在无限循环访问设置页，尝试强制导航到片段页
    if (to.path === '/settings') {
      console.warn('设置页面可能存在问题，重定向到片段页面');
      return next('/snippets');
    }
    
    return next(false);
  }
  
  // 如果是短时间内的重复导航，可能是意外情况
  if (timeGap < 100 && to.path === from.path) {
    console.warn('极短时间内的重复导航，可能是意外');
    return next(false);
  }
  
  // 更新时间并继续
  lastNavigationTime = now;
  
  // 设置文档标题 - 使用i18n翻译路由元数据中的标题
  if (to.meta.title) {
    const translatedTitle = i18n.global.t(to.meta.title as string);
    document.title = `Espanso - ${translatedTitle}`;
  } else {
    document.title = 'Espanso - 管理工具';
  }
  
  // 正常导航
  next();
});

// 添加全局导航失败处理
router.onError((error) => {
  console.error('路由错误:', error);
  
  // 导航到安全的页面
  const currentPath = router.currentRoute.value.path;
  try {
    if (currentPath === '/settings') {
      // 如果在设置页面出错，尝试导航到片段页面
      router.replace('/snippets');
    } else if (currentPath !== '/snippets') {
      // 如果不在片段页面，导航到片段页面
      router.replace('/snippets');
    }
    // 如果已经在片段页面，不做任何处理，避免循环
  } catch (err) {
    console.error('路由恢复失败:', err);
    // 最后的手段：直接操作 URL
    window.location.hash = '#/snippets';
  }
});

export default router;
