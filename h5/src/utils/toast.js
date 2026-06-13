// 轻量 Toast 通知（无框架依赖，api.js 等纯 JS 文件也可用）

let activeTimer = null;

const icons = {
  success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#00ff88" stroke-width="2"/><path d="M8 12l3 3 5-5" stroke="#00ff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ff3366" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="#ff3366" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="#ff3366" stroke-width="2" stroke-linecap="round"/></svg>',
  warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="13" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="#f59e0b"/></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#00d4ff" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="#00d4ff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="8" r="1" fill="#00d4ff"/></svg>',
};

/**
 * 显示 Toast
 * @param {string} msg - 消息文本
 * @param {'success'|'error'|'warning'|'info'} type - 类型
 * @param {number} duration - 持续时间(ms)，默认 2000
 */
export function showToast(msg, type = 'info', duration = 2000) {
  // 清除上一个
  if (activeTimer) clearTimeout(activeTimer);
  const existing = document.querySelector('.app-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = `app-toast app-toast--${type}`;
  el.innerHTML = `
    <span class="app-toast__icon">${icons[type] || icons.info}</span>
    <span class="app-toast__text">${msg}</span>
  `;

  // 注入样式（仅首次）
  if (!document.querySelector('#app-toast-style')) {
    const style = document.createElement('style');
    style.id = 'app-toast-style';
    style.textContent = `
      .app-toast {
        position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
        z-index: 9999; display: flex; align-items: center; gap: 10px;
        padding: 12px 24px; border-radius: 12px;
        background: rgba(10,14,26,.95); backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,.08);
        box-shadow: 0 8px 32px rgba(0,0,0,.4);
        animation: toastIn .3s cubic-bezier(.16,1,.3,1);
        max-width: 90vw; pointer-events: none;
      }
      .app-toast__icon { flex-shrink: 0; display: flex; }
      .app-toast__text { font-size: 14px; color: #e8ecf4; line-height: 1.4; }
      @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      @keyframes toastOut { from { opacity: 1; } to { opacity: 0; transform: translateX(-50%) translateY(-8px); } }
      .app-toast--success { border-color: rgba(0,255,136,.3); }
      .app-toast--error { border-color: rgba(255,51,102,.3); }
      .app-toast--warning { border-color: rgba(245,158,11,.3); }
      .app-toast--info { border-color: rgba(0,212,255,.3); }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(el);

  activeTimer = setTimeout(() => {
    el.style.animation = 'toastOut .25s ease-in forwards';
    setTimeout(() => el.remove(), 250);
  }, duration);
}

export default showToast;
