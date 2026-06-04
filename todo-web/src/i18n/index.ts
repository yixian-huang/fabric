import { createI18n } from 'vue-i18n';
import zh from '../locales/zh';
import en from '../locales/en';

// 获取浏览器语言或使用保存在本地存储的语言
const getBrowserLanguage = (): string => {
  const savedLanguage = localStorage.getItem('fabric_app_language');
  if (savedLanguage) {
    return savedLanguage;
  }
  
  const language = navigator.language.toLowerCase();
  return language.startsWith('zh') ? 'zh' : 'en';
};

// 检查是否启用调试模式
const isDebug = import.meta.env.DEV || import.meta.env.VITE_I18N_DEBUG === 'true';


// 创建 i18n 实例
const i18n = createI18n({
  legacy: false,      // 对Vue 3组合式API很重要
  globalInjection: true,  // 全局注入$t方法
  locale: 'en',
  fallbackLocale: getBrowserLanguage(),
  formatFallbackMessages: true,
  messages: {
    zh,
    en
  },
});

export default i18n;

// 提供切换语言的方法
export const setLanguage = (lang: string): void => {
  // 添加类型验证
  if (lang !== 'en' && lang !== 'zh') {
    console.warn('Unsupported language: ' + lang + ', fallback to en');
    lang = 'en';
  }
  // 使用断言
  (i18n.global.locale as any).value = lang;
  localStorage.setItem('fabric_app_language', lang);
  document.querySelector('html')?.setAttribute('lang', lang);
}; 