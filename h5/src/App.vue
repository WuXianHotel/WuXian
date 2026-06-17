<template>
  <div class="app" :class="{ 'app--audit': isAudit, 'app--no-nav': isOnboarded === false }">
    <router-view v-slot="{ Component, route }">
      <transition :name="transitionName">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
    <BottomNav v-if="showTabBar && !isAudit && isOnboarded === true" />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import { useAuditMode } from './utils/audit.js';

const route = useRoute();
const transitionName = ref('fade-up');
const showTabBar = computed(() => route.meta.tabIndex !== undefined);
const { isAudit } = useAuditMode();

// 添加一个状态来跟踪onboarding检查是否完成
const isOnboarded = ref(null);

// 检查onboarding状态
function checkOnboarded() {
  const onboarded = localStorage.getItem('hotel_onboarded');
  // null表示未初始化，'0'表示未完成，'1'表示已完成
  isOnboarded.value = onboarded === null ? null : onboarded !== '0';
}

// 监听localStorage变化
onMounted(() => {
  checkOnboarded();
  
  // 监听storage事件，当其他页面更新onboarding状态时同步更新
  window.addEventListener('storage', (e) => {
    if (e.key === 'hotel_onboarded') {
      checkOnboarded();
    }
  });
});

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
