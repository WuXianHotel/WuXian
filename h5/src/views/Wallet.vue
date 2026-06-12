<template>
  <div class="wallet">
    <header class="wallet__header">
      <h2 class="wallet__title">我的钱包</h2>
    </header>
    <div class="wallet__card">
      <p class="wallet__label">可用余额</p>
      <p class="wallet__balance">¥{{ (info.balance || 0).toFixed(2) }}</p>
      <p class="wallet__frozen" v-if="info.frozen_balance">冻结：¥{{ info.frozen_balance.toFixed(2) }}</p>
    </div>
    <section class="wallet__section">
      <h3 class="wallet__section-title">交易记录</h3>
      <div v-if="loading" class="wallet__loading">加载中...</div>
      <div v-else-if="!logs.length" class="wallet__empty">暂无记录</div>
      <div v-else class="wallet__log-list">
        <div v-for="log in logs" :key="log.id" class="wallet__log-item">
          <div>
            <span class="wallet__log-desc">{{ log.description }}</span>
            <span class="wallet__log-date">{{ log.created_at }}</span>
          </div>
          <span class="wallet__log-amount" :class="{ 'wallet__log-amount--plus': log.amount > 0 }">{{ log.amount > 0 ? '+' : '' }}¥{{ Math.abs(log.amount).toFixed(2) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../utils/api.js';

const info = ref({});
const logs = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await api.getWalletInfo();
    info.value = res.data || {};
  } catch {
    // ignore
  }
  try {
    const res = await api.getWalletLogs();
    logs.value = res.data || [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.wallet__header { padding: 16px; }
.wallet__title { font-size: 18px; font-weight: 700; }
.wallet__card {
  margin: 0 12px;
  background: linear-gradient(135deg, #1a56db, #2563eb);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  text-align: center;
}
.wallet__label { font-size: 14px; opacity: .85; margin-bottom: 8px; }
.wallet__balance { font-size: 36px; font-weight: 700; }
.wallet__frozen { font-size: 13px; opacity: .75; margin-top: 4px; }
.wallet__section { margin: 12px; background: #fff; border-radius: 12px; padding: 16px; }
.wallet__section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.wallet__loading, .wallet__empty { text-align: center; color: #999; padding: 20px 0; font-size: 13px; }
.wallet__log-list { display: flex; flex-direction: column; gap: 12px; }
.wallet__log-item { display: flex; justify-content: space-between; align-items: center; }
.wallet__log-desc { font-size: 14px; display: block; }
.wallet__log-date { font-size: 11px; color: #ccc; }
.wallet__log-amount { font-size: 16px; font-weight: 600; color: #ef4444; }
.wallet__log-amount--plus { color: #10b981; }
</style>
