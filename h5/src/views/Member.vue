<template>
  <div class="member">
    <NavBar title="会员中心" />
    <header class="member__header">
      <div class="member__card">
        <img v-if="info.icon && info.icon.startsWith('http')" :src="info.icon" class="member__level-icon" />
        <Crown v-else :size="28" :stroke-width="1.5" class="member__level-icon" />
        <div>
          <h2 class="member__level-name">{{ info.level_name || '普通会员' }}</h2>
          <p class="member__member-no">{{ info.member_no || '' }}</p>
        </div>
        <div class="member__stats">
          <div class="member__stat">
            <span class="member__stat-val">{{ info.points || 0 }}</span>
            <span class="member__stat-label">积分</span>
          </div>
          <div class="member__stat">
            <span class="member__stat-val">{{ info.total_nights || 0 }}</span>
            <span class="member__stat-label">间夜</span>
          </div>
          <div class="member__stat">
            <span class="member__stat-val">{{ info.discount || 100 }}折</span>
            <span class="member__stat-label">折扣</span>
          </div>
        </div>
      </div>
    </header>

    <section class="member__section">
      <h3 class="member__section-title">等级特权</h3>
      <div class="member__privileges">
        <div class="member__privilege" v-for="(p, i) in privileges" :key="i">
          <span class="member__privilege-icon">✓</span>
          <span>{{ p }}</span>
        </div>
      </div>
      <button class="member__btn" @click="goTo('/member/level')">查看全部等级</button>
    </section>

    <section class="member__section">
      <h3 class="member__section-title">积分记录</h3>
      <div v-if="pointsLoading" class="member__loading">加载中...</div>
      <div v-else-if="!pointsHistory.length" class="member__empty">暂无积分记录</div>
      <div v-else class="member__points-list">
        <div v-for="record in pointsHistory" :key="record.id" class="member__points-item">
          <div>
            <span class="member__points-desc">{{ record.description }}</span>
            <span class="member__points-date">{{ record.created_at }}</span>
          </div>
          <span class="member__points-val" :class="{ 'member__points-val--plus': record.amount > 0 }">{{ record.amount > 0 ? '+' : '' }}{{ record.amount }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Crown } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';

const router = useRouter();
const info = ref({});
const pointsHistory = ref([]);
const pointsLoading = ref(true);

const privileges = ['会员专享折扣', '积分抵现', '延迟退房', '生日礼遇'];

onMounted(async () => {
  try {
    const res = await api.getMemberInfo();
    info.value = res.data || {};
  } catch {
    // ignore
  }
  try {
    const res = await api.getPointsHistory();
    pointsHistory.value = res.data?.list || res.data || [];
  } catch {
    // ignore
  } finally {
    pointsLoading.value = false;
  }
});

function goTo(path) { router.push(path); }
</script>

<style scoped>
.member__header { padding: 16px; }
.member__card {
  background: linear-gradient(135deg, rgba(0,212,255,.15), rgba(168,85,247,.15));
  border-radius: var(--radius-lg);
  padding: 20px;
  color: var(--text-primary);
}
.member__level-icon { font-size: 32px; display: block; margin-bottom: 8px; }
.member__level-name { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
.member__member-no { font-size: 12px; opacity: .75; margin-bottom: 16px; }
.member__stats { display: flex; gap: 16px; }
.member__stat { display: flex; flex-direction: column; }
.member__stat-val { font-size: 20px; font-weight: 700; }
.member__stat-label { font-size: 11px; opacity: .75; }
.member__section { margin: 0 14px 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; }
.member__section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.member__privileges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.member__privilege { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.member__privilege-icon { color: #10b981; font-weight: 700; }
.member__btn {
  width: 100%;
  padding: 10px;
  background: rgba(0,212,255,.08);
  color: var(--neon-cyan);
  border: none;
  border-radius: 8px;
  font-size: 14px;
}
.member__loading, .member__empty { text-align: center; color: #999; padding: 20px 0; font-size: 13px; }
.member__points-list { display: flex; flex-direction: column; gap: 12px; }
.member__points-item { display: flex; justify-content: space-between; align-items: center; }
.member__points-desc { font-size: 14px; display: block; }
.member__points-date { font-size: 11px; color: #ccc; }
.member__points-val { font-size: 16px; font-weight: 600; color: #ef4444; }
.member__points-val--plus { color: #10b981; }
</style>
