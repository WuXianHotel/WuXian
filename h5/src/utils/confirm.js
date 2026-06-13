// 轻量 Confirm 对话框（无框架依赖，api.js 等纯 JS 文件也可用）

/**
 * 显示确认对话框
 * @param {string} title - 标题
 * @param {string} message - 提示内容
 * @returns {Promise<boolean>} 用户点击确认返回 true，取消返回 false
 */
export function showConfirm(title, message) {
  return new Promise((resolve) => {
    // 移除已有的
    const existing = document.querySelector('.app-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'app-confirm-overlay';
    overlay.innerHTML = `
      <div class="app-confirm">
        <h3 class="app-confirm__title">${title}</h3>
        <p class="app-confirm__msg">${message}</p>
        <div class="app-confirm__actions">
          <button class="app-confirm__btn app-confirm__btn--cancel">取消</button>
          <button class="app-confirm__btn app-confirm__btn--confirm">确认</button>
        </div>
      </div>
    `;

    // 注入样式
    if (!document.querySelector('#app-confirm-style')) {
      const style = document.createElement('style');
      style.id = 'app-confirm-style';
      style.textContent = `
        .app-confirm-overlay {
          position: fixed; inset: 0; z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
          animation: overlayIn .2s ease-out;
        }
        .app-confirm {
          background: var(--bg-card, rgba(20,28,48,.95)); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,.08); border-radius: 16px;
          padding: 24px 20px 20px; width: 300px; max-width: 85vw;
          box-shadow: 0 16px 48px rgba(0,0,0,.5);
          animation: dialogIn .3s cubic-bezier(.16,1,.3,1);
        }
        .app-confirm__title { font-size: 17px; font-weight: 700; color: #e8ecf4; margin-bottom: 10px; }
        .app-confirm__msg { font-size: 14px; color: #8892a4; line-height: 1.6; margin-bottom: 20px; }
        .app-confirm__actions { display: flex; gap: 10px; justify-content: flex-end; }
        .app-confirm__btn { padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; border: none; }
        .app-confirm__btn--cancel { background: rgba(255,255,255,.06); color: #8892a4; }
        .app-confirm__btn--cancel:hover { background: rgba(255,255,255,.1); }
        .app-confirm__btn--confirm { background: linear-gradient(135deg,#00d4ff,#a855f7); color: #fff; }
        .app-confirm__btn--confirm:hover { opacity: .9; }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dialogIn { from { opacity: 0; transform: scale(.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    const close = (val) => {
      overlay.style.animation = 'overlayIn .15s ease-in reverse';
      setTimeout(() => overlay.remove(), 150);
      resolve(val);
    };

    overlay.querySelector('.app-confirm__btn--cancel').onclick = () => close(false);
    overlay.querySelector('.app-confirm__btn--confirm').onclick = () => close(true);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}

export default showConfirm;
