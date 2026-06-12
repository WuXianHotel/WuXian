<template>
  <div class="wallet">
    <NavBar title="我的钱包" />
    <div class="wallet__card">
      <p class="wallet__label">可用余额</p>
      <p class="wallet__balance">¥{{ (info.balance || 0).toFixed(2) }}</p>
      <p v-if="info.frozen_balance" class="wallet__frozen">冻结 ¥{{ info.frozen_balance.toFixed(2) }}</p>
    </div>
    <div class="wallet__section">
      <h3 class="wallet__section-title"><Clock :size="15" /> 交易记录</h3>
      <div v-if="loading" class="wallet__state"><div class="skeleton" style="height:200px;border-radius:14px"></div></div>
      <div v-else-if="!logs.length" class="wallet__empty">暂无交易记录</div>
      <div v-else class="wallet__list">
        <div v-for="log in logs" :key="log.id" class="wallet__item">
          <div><span class="wallet__item-desc">{{ log.description }}</span><span class="wallet__item-date">{{ log.created_at }}</span></div>
          <span class="wallet__item-amount" :class="{'wallet__item-amount--plus':log.amount>0}">{{ log.amount>0?'+':'' }}¥{{ Math.abs(log.amount).toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Clock } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';

const info=ref({}),logs=ref([]),loading=ref(true);
onMounted(async()=>{try{const r=await api.getWalletInfo();info.value=r.data||{};}catch{};try{const r=await api.getWalletLogs();logs.value=r.data||[];}catch{}finally{loading.value=false;}});
</script>

<style scoped>
.wallet{padding:0 14px}
.wallet__card{margin-top:12px;padding:28px 20px;border-radius:var(--radius-lg);background:linear-gradient(135deg,rgba(0,212,255,.08),rgba(168,85,247,.08));border:1px solid var(--border-subtle);text-align:center}
.wallet__label{font-size:13px;color:var(--text-muted);margin-bottom:10px}
.wallet__balance{font-size:40px;font-weight:800;color:var(--neon-cyan)}
.wallet__frozen{font-size:12px;color:var(--text-muted);margin-top:6px}
.wallet__section{margin-top:16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px}
.wallet__section-title{display:flex;align-items:center;gap:6px;font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:14px}
.wallet__state,.wallet__empty{text-align:center;color:var(--text-muted);padding:20px 0;font-size:13px}
.wallet__list{display:flex;flex-direction:column;gap:12px}
.wallet__item{display:flex;justify-content:space-between;align-items:center;font-size:14px}
.wallet__item-desc{display:block;color:var(--text-primary)}.wallet__item-date{display:block;font-size:11px;color:var(--text-muted);margin-top:2px}
.wallet__item-amount{font-size:16px;font-weight:600;color:var(--neon-pink)}.wallet__item-amount--plus{color:var(--neon-green)}
</style>
