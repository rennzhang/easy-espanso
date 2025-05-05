import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/shadcn.css'
import './assets/styles/main.css'
import './assets/styles/tailwind.css'
import './assets/styles/global.css'
import './assets/styles/custom-tooltip.css'
import { toast } from 'vue-sonner'

// 创建应用实例
const app = createApp(App)

// 添加全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue全局错误:', err);
  console.error('错误位置:', info);
  
  // 记录错误但不中断应用
  if (err instanceof Error) {
    console.error('错误堆栈:', err.stack);
    
    // 在开发环境中显示错误通知
    if (import.meta.env.DEV) {
      try {
        toast.error(`应用错误: ${err.message}`);
      } catch (toastError) {
        console.error('显示错误提示失败:', toastError);
      }
    }
  }
  
  // 尝试恢复应用状态
  try {
    const currentPath = router.currentRoute.value.path;
    if (currentPath !== '/snippets' && currentPath !== '/') {
      console.log('检测到错误，尝试恢复到安全页面');
      router.push('/snippets').catch(e => {
        console.error('恢复导航失败:', e);
      });
    }
  } catch (navError) {
    console.error('恢复导航过程中出错:', navError);
  }
};

// 使用Pinia状态管理
app.use(createPinia())

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app').$nextTick(() => {
  console.log('应用成功挂载到DOM');
  postMessage({ payload: 'removeLoading' }, '*')
})

// 监听应用初始化完成
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM加载完成，应用初始化');
});

// 添加防刷新处理，避免Electron应用中刷新导致的路径问题
window.addEventListener('keydown', (e) => {
  // 拦截F5和Ctrl+R刷新操作
  if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
    e.preventDefault()
    console.log('防止刷新，使用路由导航替代')
    // 通过路由重新导航到当前页面，而不是真正的刷新
    router.replace(router.currentRoute.value.fullPath)
  }
})

// 捕获链接点击，防止导航离开应用
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  const closestLink = target.closest('a')
  if (closestLink && closestLink.href && !closestLink.href.startsWith('javascript:')) {
    const url = new URL(closestLink.href)
    if (url.origin === window.location.origin) {
      e.preventDefault()
      router.push(url.hash || url.pathname)
    }
  }
}, true)

// 捕获全局未处理的Promise错误
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise错误:', event.reason);
  
  // 在开发环境显示错误
  if (import.meta.env.DEV) {
    try {
      toast.error(`Promise错误: ${event.reason.message || '未知错误'}`);
    } catch (e) {
      // 忽略toast错误
    }
  }
});

// 捕获全局错误，避免白屏
window.addEventListener('error', (event) => {
  console.error('捕获到全局错误:', event.error || event.message)
  
  // 在开发环境显示错误提示
  if (import.meta.env.DEV) {
    try {
      toast.error('全局错误: ' + (event.error?.message || event.message || '未知错误'));
    } catch (e) {
      // 忽略toast错误
    }
  }
})

// 添加路由错误处理
router.onError((error) => {
  console.error('路由导航出错:', error)
  // 尝试导航到片段页面
  if (router.currentRoute.value.path !== '/snippets') {
    router.push('/snippets').catch(() => {
      // 如果路由导航失败，使用更直接的方法
      window.location.hash = '#/snippets';
    });
  }
})
