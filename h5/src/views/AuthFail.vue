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
      <button class="auth-fail__btn" @click="retry">重新授权</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

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

// 自动尝试从 URL 重新提取 token
onMounted(() => {
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
.auth-fail__btn {
  padding: 10px 32px;
  border-radius: var(--radius-full);
  border: 1px solid var(--neon-cyan);
  background: rgba(0,212,255,.1);
  color: var(--neon-cyan);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.auth-fail__btn:hover {
  background: rgba(0,212,255,.2);
}
</style>
