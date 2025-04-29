import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 导入 shadcn 样式
import './assets/styles/shadcn.css'

// 导入全局样式
import './assets/styles/main.css'

// 创建应用实例
const app = createApp(App)

// 使用Pinia状态管理
app.use(createPinia())

// 挂载应用
app.mount('#app')
