import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles/shadcn.css'
import './assets/styles/main.css'
import './assets/styles/tailwind.css'
import './assets/styles/global.css'
import './assets/styles/custom-tooltip.css'

// 创建应用实例
const app = createApp(App)

// 使用Pinia状态管理
app.use(createPinia())

// 挂载应用
app.mount('#app').$nextTick(() => {
  postMessage({ payload: 'removeLoading' }, '*')
})
