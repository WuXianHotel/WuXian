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
      <div class="od__actions" v-if="order.status === 0 || order.status === 1">
        <button class="od__btn od__btn--danger" @click="cancelOrder">取消订单</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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

onMounted(async () => {
  const id = route.params.id;
  try {
    const res = await api.getOrderDetail(id);
    order.value = res.data || {};
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
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
.od__actions { padding: 12px; }
.od__btn { width: 100%; padding: 12px; border-radius: 8px; font-size: 15px; }
.od__btn--danger { background: transparent; color: var(--neon-pink); border: 1px solid var(--neon-pink); }
</style>
