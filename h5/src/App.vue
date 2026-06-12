<template>
  <div class="app">
    <router-view />
    <!-- 底部导航仅 tab 页显示 -->
    <BottomNav v-if="showTabBar" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';

const route = useRoute();

// tab 页才显示底部导航
const showTabBar = computed(() => route.meta.tabIndex !== undefined);
</script>

<style>
/* ── 全局重置 ── */
*,
*:before,
*:after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f7f7f7;
  color: #333;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
a {
  color: inherit;
  text-decoration: none;
}
img {
  max-width: 100%;
  display: block;
}
input, button, textarea, select {
  font: inherit;
  color: inherit;
  outline: none;
}
button {
  cursor: pointer;
  border: none;
  background: none;
}
.app {
  min-height: 100vh;
  padding-bottom: 56px;
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}
</style>
