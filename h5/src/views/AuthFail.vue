<template>
  <div class="auth-fail">
    <div class="auth-fail__card">
      <div class="auth-fail__icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#999" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="#999" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="#999" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 class="auth-fail__title">需要授权</h2>
      <p class="auth-fail__desc">请从小程序入口重新进入，完成微信授权后再访问此页面。</p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.auth-fail {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: #f7f7f7;
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
  color: #333;
  margin-bottom: 12px;
}
.auth-fail__desc {
  font-size: 14px;
  color: #999;
  line-height: 1.6;
}
</style>
