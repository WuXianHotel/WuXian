<template>
  <div class="member-level">
    <NavBar title="会员等级" />
    <header class="ml__header"><h2 class="ml__title">会员等级</h2></header>
    <div v-if="loading" class="ml__loading">加载中...</div>
    <div v-else class="ml__list">
      <div v-for="level in levels" :key="level.level" class="ml__card" :class="{ 'ml__card--current': level.is_current }">
        <img v-if="level.icon && level.icon.startsWith('http')" :src="level.icon" class="ml__icon" />
        <Crown v-else :size="32" :stroke-width="1.5" class="ml__icon" />
        <div class="ml__info">
          <h3 class="ml__name">{{ level.name }}</h3>
          <p class="ml__desc">消费 {{ level.min_nights || 0 }} 间夜后升级</p>
          <p class="ml__discount">折扣：{{ level.discount || 100 }}折</p>
        </div>
        <span v-if="level.is_current" class="ml__current-badge">当前</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Crown } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';

const levels = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await api.getMemberLevels();
    levels.value = res.data?.list || res.data || [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.ml__header { padding: 16px; }
.ml__title { font-size: 18px; font-weight: 700; }
.ml__loading { text-align: center; color: #999; padding: 60px 0; }
.ml__list { padding: 0 12px 20px; display: flex; flex-direction: column; gap: 12px; }
.ml__card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  padding: 16px;
  position: relative;
}
.ml__card--current { border: 2px solid var(--neon-cyan); }
.ml__icon { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; color: var(--neon-gold); }
.ml__info { flex: 1; }
.ml__name { font-size: 16px; font-weight: 600; margin-bottom: 4px; color: var(--text-primary); }
.ml__desc, .ml__discount { font-size: 12px; color: var(--text-muted); }
.ml__current-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--neon-cyan);
  color: var(--bg-deep);
}
</style>
