// H5 入口
import './assets/theme.css'; // 设计系统
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { getToken } from './utils/auth.js';
import { initAuditMode } from './utils/audit.js';

initAuditMode();

// vConsole 调试面板开关（需要时改为 true）
const ENABLE_VCONSOLE = true;

if (ENABLE_VCONSOLE) {
  // 启用方式（任一即可）：
  //   1. URL 带 ?vconsole=1（浏览器直接访问时）
  //   2. localStorage 设置 vconsole_enabled=1（小程序 WebView 中首次需通过方式1激活）
  //   3. 页面底部双击 5 次自动激活
  // 停用：URL 带 ?vconsole=0 或在 vConsole 面板中点击 Hide
  const shouldEnableVConsole = (() => {
    const s = window.location.search;
    const h = window.location.hash;
    if (s.includes('vconsole=1') || h.includes('vconsole=1')) {
      localStorage.setItem('vconsole_enabled', '1');
      return true;
    }
    if (s.includes('vconsole=0') || h.includes('vconsole=0')) {
      localStorage.removeItem('vconsole_enabled');
      return false;
    }
    return localStorage.getItem('vconsole_enabled') === '1';
  })();

  if (shouldEnableVConsole) {
    import('vconsole').then(({ default: VConsole }) => {
      new VConsole();
      console.log('[vConsole] 调试面板已启动');
    });
  }

  // 双击5次任意位置也可激活 vConsole（兜底方案）
  let tapCount = 0;
  let tapTimer = 0;
  document.addEventListener('click', () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 800);
    if (tapCount >= 5) {
      tapCount = 0;
      localStorage.setItem('vconsole_enabled', '1');
      location.reload();
    }
  });
}

// 初始化鉴权
getToken();

const app = createApp(App);
app.use(router);
app.mount('#app');
