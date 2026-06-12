<template>
  <div class="order-confirm">
    <NavBar title="确认订单" />
    <div v-if="loading" class="ocf__loading">加载中...</div>
    <template v-else-if="order.id">
      <!-- 状态 -->
      <div class="ocf__status">
        <span class="ocf__status-icon">✓</span>
        <h2 class="ocf__status-title">订单已生成</h2>
        <p class="ocf__order-no">{{ order.order_no }}</p>
      </div>

      <!-- 房间信息 -->
      <div class="ocf__section">
        <div class="ocf__room">
          <img :src="order.room_image || '/placeholder.jpg'" :alt="order.room_name" class="ocf__room-img" />
          <div>
            <h3 class="ocf__room-name">{{ order.room_name }}</h3>
            <p class="ocf__dates">{{ order.check_in }} ~ {{ order.check_out }} · {{ order.nights }}晚</p>
          </div>
        </div>
      </div>

      <!-- 费用 -->
      <div class="ocf__section">
        <div class="ocf__row"><span>房费 ({{ order.nights }}晚)</span><span>¥{{ order.total_price }}</span></div>
        <div class="ocf__row ocf__row--total"><span>应付金额</span><span class="ocf__total">¥{{ order.total_price }}</span></div>
      </div>

      <!-- 支付 -->
      <div class="ocf__section" v-if="order.status === 'pending'">
        <h3 class="ocf__section-title">确认支付</h3>
        <p class="ocf__pay-info">将使用钱包余额支付 (余额: ¥{{ walletBalance }})</p>
        <button class="ocf__pay-btn" @click="payNow" :disabled="paying">
          {{ paying ? '支付中...' : `立即支付 ¥${order.total_price}` }}
        </button>
      </div>

      <div class="ocf__section" v-else>
        <p class="ocf__pay-done">{{ statusMap[order.status] || order.status }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';

const route = useRoute();
const order = ref({});
const loading = ref(true);
const paying = ref(false);
const walletBalance = ref('0.00');

const statusMap = { pending: '待支付', paid: '已支付', confirmed: '已确认' };

onMounted(async () => {
  const id = route.params.id;
  try {
    const [orderRes, walletRes] = await Promise.all([
      api.getOrderDetail(id),
      api.getWalletInfo().catch(() => ({ data: {} })),
    ]);
    order.value = orderRes.data || {};
    walletBalance.value = (walletRes.data?.balance || 0).toFixed(2);
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

async function payNow() {
  paying.value = true;
  try {
    await api.walletPay(order.value.order_no);
    alert('支付成功！');
    // 刷新订单状态
    const res = await api.getOrderDetail(order.value.id);
    order.value = res.data || {};
  } catch {
    // error handled by api
  } finally {
    paying.value = false;
  }
}
</script>

<style scoped>
.ocf__loading { text-align: center; color: #999; padding: 60px 0; }
.ocf__status { text-align: center; padding: 30px 16px; background: #d1fae5; }
.ocf__status-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: #10b981; color: #fff; font-size: 24px; margin-bottom: 12px; }
.ocf__status-title { font-size: 18px; font-weight: 700; color: #065f46; margin-bottom: 4px; }
.ocf__order-no { font-size: 13px; color: #999; }
.ocf__section { margin: 12px; padding: 16px; background: #fff; border-radius: 12px; }
.ocf__room { display: flex; gap: 12px; }
.ocf__room-img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: #eee; }
.ocf__room-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.ocf__dates { font-size: 13px; color: #999; }
.ocf__section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.ocf__row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
.ocf__row--total { font-weight: 600; border-top: 1px solid #f5f5f5; padding-top: 8px; margin-top: 8px; }
.ocf__total { font-size: 20px; color: #e02424; }
.ocf__pay-info { font-size: 13px; color: #666; margin-bottom: 12px; }
.ocf__pay-btn { width: 100%; padding: 14px; background: #e02424; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; }
.ocf__pay-btn:disabled { opacity: .6; }
.ocf__pay-done { font-size: 16px; font-weight: 600; text-align: center; color: #10b981; }
</style>
