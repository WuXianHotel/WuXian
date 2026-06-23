// H5 入口
import './assets/theme.css'; // 设计系统
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { getToken } from './utils/auth.js';
import { initAuditMode } from './utils/audit.js';

initAuditMode();

// 在 getToken() 消费前保存 URL 状态（方便排查 token 丢失问题）
window.__H5_ENTRY_URL = window.location.href;
window.__H5_ENTRY_SEARCH = window.location.search;
window.__H5_ENTRY_HASH = window.location.hash;

// vConsole 调试面板：由后台 settings.vconsole_enabled 控制
// 默认 false，后台开启后页面加载即激活，无需改代码
(async () => {
  try {
    const apiBase = import.meta.env.VITE_API_BASE || window.location.origin;
    const res = await fetch(`${apiBase}/api/mp/config`);
    const body = await res.json();
    const cfg = body.data || {};
    if (cfg.vconsole_enabled === 'true') {
      const { default: VConsole } = await import('vconsole');
      new VConsole();
      console.log('[vConsole] 入口URL(原始):', window.__H5_ENTRY_URL);
      console.log('[vConsole] 入口search(原始):', window.__H5_ENTRY_SEARCH);
      console.log('[vConsole] 入口hash(原始):', window.__H5_ENTRY_HASH);
      console.log('[vConsole] 当前URL:', window.location.href);
      console.log('[vConsole] token in localStorage:', localStorage.getItem('hotel_h5_token') || '(none)');
    }
  } catch {
    // 网络不可用时静默跳过
  }
})();

// 初始化鉴权
getToken();

const app = createApp(App);
app.use(router);
app.mount('#app');
