<template>
  <div class="auth-fail">
    <div class="auth-fail__card">
      <div class="auth-fail__icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--text-muted)" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 class="auth-fail__title">需要授权</h2>
      <p class="auth-fail__desc">请点击下方按钮重新获取授权</p>
      <div class="auth-fail__actions">
        <button class="auth-fail__btn auth-fail__btn--primary" @click="retry">重新授权</button>
        <button class="auth-fail__btn auth-fail__btn--secondary" @click="goHome">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

function retry() {
  // 通知小程序重新登录
  if (typeof wx !== 'undefined' && wx.miniProgram) {
    wx.miniProgram.postMessage({ data: { action: 'reAuth' } });
    // 小程序收到消息后会重新执行 initAuth → 刷新 WebView
  } else {
    // 浏览器环境：跳转到首页让 URL 重新加载
    location.href = 'https://wuxian-hotel.online/h5/';
  }
}

function goHome() {
  router.push('/');
}

// 自动尝试从 URL 重新提取 token
onMounted(() => {
  // 如果 URL 带 audit=1，说明审核模式，已跳过登录，不重复刷新
  if (window.location.search.indexOf('audit=1') >= 0) return;
  // 延迟一小段时间让 getToken() 有机会再运行一次
  const s = window.location.search;
  const h = window.location.hash;
  // 如果 URL 中仍有 token，重新触发提取
  if ((s || h).includes('token=')) {
    try { location.href = location.href; } catch {}
  }
});
</script>

<style scoped>
.auth-fail {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: var(--bg-deep);
}
.auth-fail__card {
  text-align: center;
  padding: 40px 30px;
}
.auth-fail__icon {
  margin-bottom: 20px;
}
.auth-fail__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.auth-fail__desc {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 24px;
}
.auth-fail__actions {
  display: flex; flex-direction: column; gap: var(--space-sm); align-items: center;
}
.auth-fail__btn {
  padding: 10px 32px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--neon-cyan);
}
.auth-fail__btn--primary {
  background: rgba(0,212,255,.1); color: var(--neon-cyan);
}
.auth-fail__btn--primary:hover { background: rgba(0,212,255,.2); }
.auth-fail__btn--secondary {
  background: transparent; color: var(--text-muted); border-color: var(--border-subtle);
}
.auth-fail__btn--secondary:hover { color: var(--text-secondary); }
</style>
