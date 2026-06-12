// H5 入口
import './assets/theme.css'; // 设计系统
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { getToken } from './utils/auth.js';

// vConsole 调试（URL 带 vconsole=1 时启用）
const search = window.location.search;
const hash = window.location.hash;
if (search.includes('vconsole=1') || hash.includes('vconsole=1')) {
  import('vconsole').then(({ default: VConsole }) => {
    new VConsole();
    console.log('[vConsole] 调试面板已启动');
  });
}

// 初始化鉴权
getToken();

const app = createApp(App);
app.use(router);
app.mount('#app');
