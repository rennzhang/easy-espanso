import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

// 导入视图组件
const SnippetsView = () => import('../views/SnippetsView.vue');
const SettingsView = () => import('../views/SettingsView.vue');
const NotFoundView = () => import('../views/NotFoundView.vue');

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
      title: '片段管理',
      icon: 'Scissors'
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: {
      title: '设置',
      icon: 'Settings'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      title: '页面不存在'
    }
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置文档标题
  document.title = `Espanso - ${to.meta.title || '管理工具'}`;
  next();
});

export default router;
