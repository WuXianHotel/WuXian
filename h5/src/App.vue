<template>
  <div class="app" :class="{ 'app--audit': isAudit, 'app--no-nav': !isOnboarded }">
    <router-view v-slot="{ Component, route }">
      <transition :name="transitionName">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
    <BottomNav v-if="showTabBar && !isAudit && isOnboarded" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import { useAuditMode } from './utils/audit.js';

const route = useRoute();
const transitionName = ref('fade-up');
const showTabBar = computed(() => route.meta.tabIndex !== undefined);
const isOnboarded = computed(() => localStorage.getItem('hotel_onboarded') !== '0');
const { isAudit } = useAuditMode();

// 根据页面层级决定动效方向（回到 tab 页时无动画）
watch(() => route.path, (to, from) => {
  // 目标为 tab 页 → 无动画（直接显示）
  if (route.meta.tabIndex !== undefined) {
    transitionName.value = '';
    return;
  }
  const toDepth = (to.match(/\//g) || []).length;
  const fromDepth = (from || '').match(/\//g)?.length || 0;
  transitionName.value = toDepth > fromDepth ? 'slide-left' : 'slide-right';
});
</script>

<style>
.app {
  min-height: 100vh;
  padding-bottom: calc(52px + constant(safe-area-inset-bottom));
  padding-bottom: calc(52px + env(safe-area-inset-bottom, 0px));
  position: relative;
  z-index: 1;
}

.app--audit,
.app--no-nav {
  padding-bottom: 0;
}

/* ── 页面过渡动效 ── */
.fade-up-enter-active {
  animation: fadeInUp .35s cubic-bezier(.16,1,.3,1);
}
.fade-up-leave-active {
  animation: fadeOutDown .25s cubic-bezier(.4,0,1,1);
}
.slide-left-enter-active {
  animation: slideInRight .3s cubic-bezier(.16,1,.3,1);
}
.slide-left-leave-active {
  animation: slideOutLeft .25s cubic-bezier(.4,0,1,1);
}
.slide-right-enter-active {
  animation: slideInLeft .3s cubic-bezier(.16,1,.3,1);
}
.slide-right-leave-active {
  animation: slideOutRight .25s cubic-bezier(.4,0,1,1);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeOutDown {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(20px); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideOutLeft {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-30px); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideOutRight {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(30px); }
}
</style>
