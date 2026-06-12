<template>
  <div class="order-create">
    <div v-if="loading" class="oc__loading">加载中...</div>
    <template v-else>
      <!-- 房型信息 -->
      <div class="oc__section">
        <div class="oc__room">
          <img :src="room.image_url || '/placeholder.jpg'" :alt="room.name" class="oc__room-img" />
          <div>
            <h3 class="oc__room-name">{{ room.name }}</h3>
            <p class="oc__dates">{{ checkIn }} ~ {{ checkOut }} · {{ nights }}晚</p>
            <p class="oc__price">¥{{ room.price }}/晚</p>
          </div>
        </div>
      </div>

      <!-- 入住人信息 -->
      <div class="oc__section">
        <h3 class="oc__section-title">入住人信息</h3>
        <div class="oc__field">
          <label class="oc__label">姓名</label>
          <input v-model="form.guestName" class="oc__input" placeholder="请输入入住人姓名" />
        </div>
        <div class="oc__field">
          <label class="oc__label">手机号</label>
          <input v-model="form.guestPhone" class="oc__input" placeholder="请输入手机号" type="tel" />
        </div>
        <div class="oc__field">
          <label class="oc__label">备注</label>
          <textarea v-model="form.remark" class="oc__textarea" placeholder="如有特殊需求请备注" rows="3"></textarea>
        </div>
      </div>

      <!-- 费用明细 -->
      <div class="oc__section">
        <h3 class="oc__section-title">费用明细</h3>
        <div class="oc__row"><span>房费 ({{ nights }}晚)</span><span>¥{{ roomTotal }}</span></div>
        <div class="oc__row oc__row--total"><span>合计</span><span class="oc__total-amount">¥{{ finalTotal }}</span></div>
      </div>

      <!-- 支付方式 -->
      <div class="oc__section">
        <h3 class="oc__section-title">支付方式</h3>
        <label class="oc__pay-way">
          <input type="radio" value="wallet" v-model="form.payMethod" checked />
          <span>钱包余额 (余额: ¥{{ walletBalance || '0.00' }})</span>
        </label>
      </div>

      <!-- 底部提交 -->
      <div class="oc__footer">
        <div class="oc__footer-inner">
          <span class="oc__footer-total">合计: ¥{{ finalTotal }}</span>
          <button class="oc__submit" @click="submitOrder" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交订单' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../utils/api.js';

const route = useRoute();
const router = useRouter();

const room = ref({});
const loading = ref(true);
const submitting = ref(false);
const checkIn = ref('');
const checkOut = ref('');
const nights = ref(1);
const walletBalance = ref('0.00');

const form = reactive({
  guestName: '',
  guestPhone: '',
  remark: '',
  payMethod: 'wallet',
});

const roomTotal = computed(() => (room.value.price || 0) * nights.value);
const finalTotal = computed(() => roomTotal.value);

onMounted(async () => {
  const { roomId, checkIn: ci, checkOut: co } = route.query;
  checkIn.value = ci || '';
  checkOut.value = co || '';
  if (ci && co) {
    nights.value = Math.round((new Date(co) - new Date(ci)) / 86400000);
  }

  try {
    const [roomRes, walletRes] = await Promise.all([
      api.getRoomDetail(roomId),
      api.getWalletInfo().catch(() => ({ data: {} })),
    ]);
    room.value = roomRes.data || {};
    walletBalance.value = (walletRes.data?.balance || 0).toFixed(2);
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

async function submitOrder() {
  if (!form.guestName.trim()) {
    alert('请输入入住人姓名');
    return;
  }
  // 手机号非必填时不拦截，但有填写则校验
  if (form.guestPhone && !/^1[3-9]\d{9}$/.test(form.guestPhone)) {
    alert('请输入正确的手机号');
    return;
  }

  submitting.value = true;
  try {
    const res = await api.createOrder({
      roomId: route.query.roomId,
      checkIn: checkIn.value,
      checkOut: checkOut.value,
      guestName: form.guestName,
      guestPhone: form.guestPhone,
      remark: form.remark,
      payMethod: form.payMethod,
    });
    const order = res.data || {};
    router.push(`/order/confirm/${order.id || order.orderId}`);
  } catch {
    // error handled by api
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.oc__loading { text-align: center; color: #999; padding: 60px 0; }
.oc__section { margin: 12px; padding: 16px; background: #fff; border-radius: 12px; }
.oc__room { display: flex; gap: 12px; }
.oc__room-img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: #eee; }
.oc__room-name { font-size: 16px; font-weight: 600; margin-bottom: 2px; }
.oc__dates { font-size: 13px; color: #999; }
.oc__price { font-size: 15px; font-weight: 600; color: #e02424; }
.oc__section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.oc__field { margin-bottom: 12px; }
.oc__field:last-child { margin-bottom: 0; }
.oc__label { display: block; font-size: 13px; color: #666; margin-bottom: 4px; }
.oc__input, .oc__textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 15px;
  background: #fafafa;
  resize: none;
}
.oc__row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
.oc__row--total { font-weight: 600; border-top: 1px solid #f5f5f5; padding-top: 8px; margin-top: 8px; }
.oc__total-amount { font-size: 20px; color: #e02424; }
.oc__pay-way { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.oc__footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #eee; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); z-index: 10; }
.oc__footer-inner { display: flex; align-items: center; justify-content: space-between; }
.oc__footer-total { font-size: 16px; font-weight: 600; }
.oc__submit { padding: 12px 28px; background: #e02424; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; }
.oc__submit:disabled { opacity: .6; }
</style>
