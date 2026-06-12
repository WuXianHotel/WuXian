<template>
  <div class="order-detail">
    <div v-if="loading" class="od__loading">加载中...</div>
    <template v-else-if="order.id">
      <div class="od__status" :style="{ background: statusBg }">
        <span class="od__status-text">{{ statusMap[order.status] || order.status }}</span>
        <p class="od__order-no">订单号：{{ order.order_no }}</p>
      </div>
      <div class="od__section">
        <div class="od__room">
          <img :src="order.room_image || '/placeholder.jpg'" :alt="order.room_name" class="od__room-img" />
          <div>
            <h3 class="od__room-name">{{ order.room_name }}</h3>
            <p class="od__dates">{{ order.check_in }} ~ {{ order.check_out }} · {{ order.nights || 1 }}晚</p>
          </div>
        </div>
      </div>
      <div class="od__section">
        <div class="od__row"><span>房费</span><span>¥{{ order.room_price }}</span></div>
        <div class="od__row" v-if="order.discount_amount"><span>会员折扣</span><span class="od__discount">-¥{{ order.discount_amount }}</span></div>
        <div class="od__row" v-if="order.points_deduct"><span>积分抵扣</span><span class="od__discount">-¥{{ order.points_deduct }}</span></div>
        <div class="od__row od__row--total"><span>实付</span><span class="od__total-price">¥{{ order.total_price }}</span></div>
      </div>
      <div class="od__section" v-if="order.payment_method">
        <div class="od__row"><span>支付方式</span><span>{{ order.payment_method === 'wallet' ? '钱包余额' : order.payment_method }}</span></div>
      </div>
      <div class="od__actions" v-if="order.status === 'pending'">
        <button class="od__btn od__btn--danger" @click="cancelOrder">取消订单</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../utils/api.js';

const route = useRoute();
const router = useRouter();
const order = ref({});
const loading = ref(true);

const statusMap = { pending: '待支付', paid: '已支付', confirmed: '已确认', checked_in: '已入住', completed: '已完成', cancelled: '已取消' };
const statusBgMap = { pending: '#fef3c7', paid: '#d1fae5', confirmed: '#dbeafe', checked_in: '#ede9fe', completed: '#f3f4f6', cancelled: '#fee2e2' };

const statusBg = ref('#f3f4f6');

onMounted(async () => {
  const id = route.params.id;
  try {
    const res = await api.getOrderDetail(id);
    order.value = res.data || {};
    statusBg.value = statusBgMap[order.value.status] || '#f3f4f6';
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

async function cancelOrder() {
  if (!confirm('确认取消该订单？')) return;
  try {
    await api.cancelOrder(order.value.id);
    alert('订单已取消');
    router.back();
  } catch {
    // error handled by api
  }
}
</script>

<style scoped>
.od__loading { text-align: center; color: #999; padding: 60px 0; }
.od__status { padding: 24px 16px; text-align: center; }
.od__status-text { font-size: 18px; font-weight: 700; }
.od__order-no { font-size: 12px; color: #999; margin-top: 4px; }
.od__section { margin: 12px; padding: 16px; background: #fff; border-radius: 12px; }
.od__room { display: flex; gap: 12px; }
.od__room-img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: #eee; }
.od__room-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.od__dates { font-size: 13px; color: #999; }
.od__row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
.od__row:last-child { margin-bottom: 0; }
.od__row--total { font-weight: 600; border-top: 1px solid #f5f5f5; padding-top: 8px; margin-top: 8px; }
.od__discount { color: #10b981; }
.od__total-price { font-size: 20px; color: #1a56db; }
.od__actions { padding: 12px; }
.od__btn { width: 100%; padding: 12px; border-radius: 8px; font-size: 15px; }
.od__btn--danger { background: #fff; color: #ef4444; border: 1px solid #ef4444; }
</style>
