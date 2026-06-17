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

// vConsole 调试面板开关（需要时改为 true）
const ENABLE_VCONSOLE = true;

if (ENABLE_VCONSOLE) {
  import('vconsole').then(({ default: VConsole }) => {
    new VConsole();
    console.log('[vConsole] 入口URL(原始):', window.__H5_ENTRY_URL);
    console.log('[vConsole] 入口search(原始):', window.__H5_ENTRY_SEARCH);
    console.log('[vConsole] 入口hash(原始):', window.__H5_ENTRY_HASH);
    console.log('[vConsole] 当前URL:', window.location.href);
    console.log('[vConsole] 当前search:', window.location.search);
    console.log('[vConsole] token in localStorage:', localStorage.getItem('hotel_h5_token') || '(none)');
  });

  // 双击5次任意位置也可激活 vConsole（兜底方案）
  let tapCount = 0;
  let tapTimer = 0;
  document.addEventListener('click', () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 800);
    if (tapCount >= 5) {
      tapCount = 0;
      location.reload();
    }
  });
}

// 初始化鉴权
getToken();

const app = createApp(App);
app.use(router);
app.mount('#app');
