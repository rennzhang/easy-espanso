import { createI18n } from 'vue-i18n';

// 导入语言文件
import en from './locales/en';
import zhCN from './locales/zh-CN';

// 默认语言
const defaultLocale = 'zh-CN';

// 创建 i18n 实例
// 在这种模式下，vue-i18n 通常能自动推断类型
const i18n = createI18n({
  legacy: false, // 保持 Composition API 模式
  locale: defaultLocale,
  fallbackLocale: 'en',
  globalInjection: true, // 添加此配置确保模板中可以使用 $t 等方法
  messages: {
    // 直接使用导入的对象
    en: en,
    'zh-CN': zhCN,
  },
});

export default i18n; 