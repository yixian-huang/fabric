import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createHead } from '@unhead/vue/client';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';
import './assets/main.css';
import i18n from './i18n';
import { useSiteSettings } from './composables/useSiteSettings';

const app = createApp(App);
const pinia = createPinia();
const head = createHead();

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(pinia);
app.use(head);
app.use(router);
app.use(ElementPlus);
app.use(i18n);
const { loadPublicSettings } = useSiteSettings();
loadPublicSettings();
app.mount('#app'); 