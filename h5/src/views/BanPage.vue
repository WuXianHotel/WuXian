<template>
  <div class="ban">
    <div class="ban__card">
      <div class="ban__icon">
        <ShieldOff :size="56" :stroke-width="1.5" />
      </div>
      <h1 class="ban__title">账号已封禁</h1>
      <p class="ban__desc">您的账号已被限制访问，如有疑问请联系酒店客服</p>
      <div class="ban__phone" v-if="hotelPhone">
        <Phone :size="16" />
        <a :href="`tel:${hotelPhone}`">{{ hotelPhone }}</a>
      </div>
      <button class="ban__btn" @click="retry">重试</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ShieldOff, Phone } from 'lucide-vue-next';
import api from '../utils/api.js';

const hotelPhone = ref('');

onMounted(async () => {
  try {
    const res = await api.getHotelConfig();
    hotelPhone.value = res.data?.hotel_phone || '';
  } catch {
    // ignore
  }
});

function retry() {
  localStorage.removeItem('hotel_h5_token');
  localStorage.removeItem('hotel_h5_user');
  window.location.href = '/';
}
</script>

<style scoped>
.ban {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-md);
}
.ban__card {
  text-align: center;
  max-width: 320px;
  width: 100%;
}
.ban__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  margin-bottom: var(--space-lg);
  background: rgba(255, 51, 102, .08);
  border: 2px solid rgba(255, 51, 102, .15);
  color: var(--neon-pink);
}
.ban__title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--neon-pink);
  margin-bottom: var(--space-sm);
  letter-spacing: 1px;
}
.ban__desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: var(--space-lg);
}
.ban__phone {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: rgba(0, 212, 255, .08);
  color: var(--neon-cyan);
  font-size: 14px;
  margin-bottom: var(--space-lg);
}
.ban__phone a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}
.ban__btn {
  display: block;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--dur-fast);
}
.ban__btn:hover {
  border-color: var(--neon-pink);
  color: var(--neon-pink);
}
</style>
