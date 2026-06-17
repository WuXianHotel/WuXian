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
      <button class="ban__btn" @click="retry" :disabled="checking">
        {{ checking ? '检查中...' : '重试' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ShieldOff, Phone } from 'lucide-vue-next';
import api from '../utils/api.js';
import { showToast } from '../utils/toast.js';

const router = useRouter();
const hotelPhone = ref('');
const checking = ref(false);

onMounted(async () => {
  try {
    const res = await api.getHotelConfig();
    hotelPhone.value = res.data?.hotel_phone || '';
  } catch {
    // ignore
  }
});

async function retry() {
  checking.value = true;
  try {
    // 调用 profile 检测封禁状态
    const res = await api.getProfile();
    if (res.code === 0) {
      // 已解封 → 回到首页
      window.location.replace('/h5/');
    }
  } catch (err) {
    console.error('[BanPage] retry error:', err.message, err);
    // 403: 仍在封禁，api.js 不跳转（已在 banned 页）
    if (err.message === '403') {
      showToast('账号仍在封禁中', 'warning');
    } else if (err.message === '401') {
      // 401 已由 api.js 处理（清 token + toast），不再重复提示
    } else {
      showToast(err.message || '网络错误，请稍后再试', 'error');
    }
  } finally {
    checking.value = false;
  }
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
.ban__btn:disabled { opacity: .5; cursor: default; }
</style>
