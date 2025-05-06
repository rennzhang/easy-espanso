import { createI18n } from 'vue-i18n';

// 导入语言文件
import en from './locales/en';
import zhCN from './locales/zh-CN';

// 尝试从localStorage读取用户语言设置
const loadStoredLocale = () => {
  try {
    // 先尝试从localStorage检查是否已保存语言设置
    const storedLocale = localStorage.getItem('espanso-language');
    if (storedLocale && ['en', 'zh-CN'].includes(storedLocale)) {
      console.log(`[i18n] 从localStorage加载语言设置: ${storedLocale}`);
      return storedLocale;
    }
  } catch (e) {
    console.warn('[i18n] 无法从localStorage读取语言设置:', e);
  }
  
  // 默认语言
  return 'zh-CN';
};

// 获取初始语言
const initialLocale = loadStoredLocale();

// 创建 i18n 实例
// 在这种模式下，vue-i18n 通常能自动推断类型
const i18n = createI18n({
  legacy: false, // 保持 Composition API 模式
  locale: initialLocale,
  fallbackLocale: 'en',
  globalInjection: true, // 添加此配置确保模板中可以使用 $t 等方法
  messages: {
    // 直接使用导入的对象
    en: en,
    'zh-CN': zhCN,
  },
});

export default i18n; 