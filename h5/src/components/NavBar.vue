<template>
  <header class="nav-bar">
    <button class="nav-bar__back" @click="goBack" aria-label="返回">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <h1 class="nav-bar__title">{{ title }}</h1>
    <!-- 占位保持标题居中 -->
    <span class="nav-bar__placeholder"></span>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router';

defineProps({
  title: {
    type: String,
    default: '',
  },
});

const router = useRouter();

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    // 无历史记录时跳回首页
    router.replace('/');
  }
}
</script>

<style scoped>
.nav-bar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 8px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid #f0f0f0;
}
.nav-bar__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: #333;
  flex-shrink: 0;
}
.nav-bar__title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-bar__placeholder {
  width: 44px;
  flex-shrink: 0;
}
</style>
