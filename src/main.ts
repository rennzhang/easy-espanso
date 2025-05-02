import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import sortableDirective from './directives/sortable' // 导入指令

// 导入 shadcn 样式
import './assets/styles/shadcn.css'

// 导入全局样式
import './assets/styles/main.css'

// 创建应用实例
const app = createApp(App)

// 使用Pinia状态管理
app.use(createPinia())

// 注册全局指令
app.directive('sortable', sortableDirective)

// 挂载应用
app.mount('#app')
