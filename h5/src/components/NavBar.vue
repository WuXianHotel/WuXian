<template>
  <header class="nb">
    <button class="nb__back" @click="goBack" aria-label="返回">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M16 19L7 12l9-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <h1 class="nb__title">{{ title }}</h1>
    <span class="nb__spacer"></span>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router';

defineProps({ title: { type: String, default: '' } });
const router = useRouter();

function goBack() {
  if (window.history.length > 1) router.back();
  else router.replace('/');
}
</script>

<style scoped>
.nb {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 8px;
  background: rgba(10, 14, 26, .88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(255, 255, 255, .06);
}
.nb__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--text-secondary);
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  transition: all var(--dur-fast) var(--ease-out);
}
.nb__back:hover { color: var(--neon-cyan); background: rgba(0, 212, 255, .08); }
.nb__title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: .5px;
}
.nb__spacer { width: 40px; flex-shrink: 0; }
</style>
