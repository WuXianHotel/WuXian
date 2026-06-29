<template>
  <div class="order-detail">
    <NavBar title="订单详情" />
    <div v-if="loading" class="od__loading">加载中...</div>
    <template v-else-if="order.order_no">
      <div class="od__status">
        <span class="od__status-text">{{ statusMap[order.status] || order.status }}</span>
        <p class="od__order-no">订单号：{{ order.order_no }}</p>
      </div>
      <div class="od__section">
        <div class="od__room">
          <img :src="getFirstImg(order.room_images)" :alt="order.room_name" class="od__room-img" />
          <div>
            <h3 class="od__room-name">{{ order.room_name }}</h3>
            <p class="od__dates">{{ order.check_in_date }} ~ {{ order.check_out_date }} · {{ order.nights || 1 }}晚</p>
          </div>
        </div>
      </div>
      <div class="od__section">
        <div class="od__row"><span>应付金额</span><span class="od__total-price">¥{{ order.pay_amount }}</span></div>
      </div>
      <!-- 退款中 / 已退款：显示退款信息 -->
      <div class="od__section" v-if="order.status === 5 || order.status === 6">
        <div class="od__refund-info">
          <div class="od__refund-icon">{{ order.status === 5 ? '⏳' : '✅' }}</div>
          <div class="od__refund-text">
            <p class="od__refund-title">{{ order.status === 5 ? '退款处理中' : '已退款' }}</p>
            <p class="od__refund-desc">退款金额将在线下完成处理（银行转账、现金等方式），不通过微信原路退回，请留意工作人员联系。</p>
          </div>
        </div>
      </div>
      <!-- 待支付：支付 + 取消 -->
      <div class="od__section" v-if="order.status === 0 && !isExpired">
        <div class="od__countdown">
          <span class="od__countdown-label">订单将在 </span>
          <span class="od__countdown-time">{{ countdownText }}</span>
          <span class="od__countdown-label"> 后自动取消</span>
        </div>
      </div>
      <div class="od__section" v-if="order.status === 0 && isExpired">
        <div class="od__countdown od__countdown--expired">订单已超时取消</div>
      </div>
      <div class="od__actions" v-if="order.status === 0">
        <button class="od__btn od__btn--pay" @click="goPay" :disabled="isExpired">{{ isExpired ? '已超时取消' : '立即支付' }}</button>
        <button class="od__btn od__btn--cancel" @click="cancelOrder" v-if="!isExpired">取消订单</button>
      </div>
      <!-- 待入住：取消 -->
      <div class="od__actions" v-if="order.status === 1">
        <button class="od__btn od__btn--danger" @click="cancelOrder">取消订单</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';
import { showToast } from '../utils/toast.js';
import { showConfirm } from '../utils/confirm.js';

const route = useRoute();
const router = useRouter();
const order = ref({});
const loading = ref(true);

const statusMap = { 0: '待支付', 1: '待入住', 2: '入住中', 3: '已退房', 4: '已取消', 5: '退款中', 6: '已退款' };

// 待支付倒计时（15分钟）
const PAY_TIMEOUT_MS = 15 * 60 * 1000;
const countdown = ref(0);
let countdownTimer = null;
const countdownText = computed(() => {
  if (countdown.value <= 0) return '已超时';
  const m = Math.floor(countdown.value / 60);
  const s = countdown.value % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});
const isExpired = computed(() => countdown.value <= 0);

function startCountdown(createdAt) {
  if (!createdAt) return;
  const expiredAt = new Date(createdAt).getTime() + PAY_TIMEOUT_MS;
  const update = () => {
    const remaining = Math.max(0, Math.ceil((expiredAt - Date.now()) / 1000));
    countdown.value = remaining;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      // 刷新订单状态
      api.getOrderDetail(order.value.order_no).then(res => {
        order.value = res.data || {};
      }).catch(() => {});
    }
  };
  update();
  countdownTimer = setInterval(update, 1000);
}

onMounted(async () => {
  const id = route.params.id;
  try {
    const res = await api.getOrderDetail(id);
    order.value = res.data || {};
    if (order.value.status === 0 && order.value.created_at) {
      startCountdown(order.value.created_at);
    }
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

function getFirstImg(images) {
  if (!images) return '/placeholder.jpg';
  if (Array.isArray(images)) return images[0] || '/placeholder.jpg';
  if (typeof images === 'string') {
    try { const arr = JSON.parse(images); if (Array.isArray(arr) && arr.length) return arr[0]; } catch {}
    if (images.startsWith('http')) return images;
  }
  return '/placeholder.jpg';
}
function goPay() {
  router.push(`/order/confirm/${order.value.order_no}`);
}

async function cancelOrder() {
  const ok = await showConfirm('取消订单', '确认取消该订单？');
  if (!ok) return;
  try {
    await api.cancelOrder(order.value.order_no);
    showToast('订单已取消', 'success');
    router.back();
  } catch {
    // error handled by api
  }
}
</script>

<style scoped>
.od__loading { text-align: center; color: var(--text-muted); padding: 60px 0; }
.od__status { padding: 24px 16px; text-align: center; }
.od__status-text { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.od__order-no { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.od__section { margin: 10px 14px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
.od__room { display: flex; gap: 12px; }
.od__room-img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: rgba(255,255,255,.03); }
.od__room-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; color: var(--text-primary); }
.od__dates { font-size: 13px; color: var(--text-muted); }
.od__row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; color: var(--text-secondary); }
.od__row:last-child { margin-bottom: 0; }
.od__row--total { font-weight: 600; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 8px; color: var(--text-primary); }
.od__discount { color: var(--neon-green); }
.od__total-price { font-size: 20px; color: var(--neon-cyan); }
.od__actions { padding: var(--space-sm) var(--space-md); display: flex; gap: var(--space-sm); }
.od__btn { flex: 1; padding: 12px; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; border: 0; cursor: pointer; transition: all var(--dur-fast); }
.od__btn--pay { background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)); color: #fff; }
.od__btn--pay:active { transform: scale(.97); }
.od__btn--cancel { background: transparent; color: var(--text-muted); border: 1px solid var(--border-subtle); }
.od__btn--danger { background: transparent; color: var(--neon-pink); border: 1px solid var(--neon-pink); }
/* 退款信息 */
.od__refund-info { display: flex; gap: 12px; align-items: flex-start; }
.od__refund-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
.od__refund-text { flex: 1; }
.od__refund-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.od__refund-desc { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
/* 支付倒计时 */
.od__countdown { text-align: center; font-size: 13px; color: var(--text-muted); }
.od__countdown-time { font-weight: 700; color: var(--neon-gold); }
.od__countdown--expired { color: var(--neon-pink); font-weight: 600; }
.od__btn:disabled { opacity: .5; pointer-events: none; }
</style>
