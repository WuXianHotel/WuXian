<template>
  <nav class="bn">
    <router-link
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="bn__item"
      active-class="bn__item--active"
    >
      <component :is="tab.icon" class="bn__icon" :size="22" :stroke-width="1.8" />
      <span class="bn__label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { Home, Search, ClipboardList, User } from 'lucide-vue-next';

const tabs = [
  { path: '/', label: '首页', icon: Home },
  { path: '/rooms', label: '探索', icon: Search },
  { path: '/orders', label: '订单', icon: ClipboardList },
  { path: '/profile', label: '我的', icon: User },
];
</script>

<style scoped>
.bn {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  height: calc(52px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(12, 16, 28, .92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, .06);
}
.bn__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 10px;
  gap: 2px;
  transition: color var(--dur-normal) var(--ease-out);
  position: relative;
}
.bn__item--active {
  color: var(--neon-cyan);
}
.bn__item--active:before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: var(--neon-cyan);
  border-radius: 0 0 2px 2px;
  box-shadow: 0 0 8px rgba(0, 212, 255, .5);
}
.bn__icon {
  transition: transform var(--dur-normal) var(--ease-spring);
}
.bn__item--active .bn__icon {
  transform: scale(1.1);
}
.bn__label {
  line-height: 1;
  font-weight: 500;
}
.bn__badge {
  position: absolute;
  top: 2px;
  right: calc(50% - 20px);
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  background: var(--neon-pink);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}
</style>
