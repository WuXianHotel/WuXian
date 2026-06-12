<template>
  <nav class="bn">
    <router-link
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="bn__item"
      active-class="bn__item--active"
    >
      <span class="bn__icon" v-html="tab.icon"></span>
      <span class="bn__label">{{ tab.label }}</span>
      <span v-if="tab.badge" class="bn__badge">{{ tab.badge }}</span>
    </router-link>
  </nav>
</template>

<script setup>
const tabs = [
  {
    path: '/',
    label: '首页',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    path: '/rooms',
    label: '探索',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><line x1="21" y1="21" x2="16.2" y2="16.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
  {
    path: '/orders',
    label: '订单',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    path: '/profile',
    label: '我的',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
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
  height: 56px;
  background: rgba(12, 16, 28, .92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, .06);
  padding-bottom: env(safe-area-inset-bottom);
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
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
