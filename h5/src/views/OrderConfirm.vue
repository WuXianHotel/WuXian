<template>
  <div class="ocf">
    <NavBar title="确认订单" />

    <!-- 步骤条 -->
    <div class="ocf__steps">
      <div class="ocf__step"><div class="ocf__step-num ocf__step-num--done">✓</div><span class="ocf__step-label ocf__step-label--done">选择日期</span></div>
      <div class="ocf__step-line ocf__step-line--done"></div>
      <div class="ocf__step"><div class="ocf__step-num ocf__step-num--done">✓</div><span class="ocf__step-label ocf__step-label--done">填写信息</span></div>
      <div class="ocf__step-line ocf__step-line--done"></div>
      <div class="ocf__step"><div class="ocf__step-num ocf__step-num--active">3</div><span class="ocf__step-label ocf__step-label--active">确认支付</span></div>
    </div>

    <div v-if="loading" class="ocf__state">加载中...</div>
    <template v-else-if="order.id">
      <!-- 订单详情 -->
      <div class="ocf__card">
        <div class="ocf__card-title"><ClipboardList :size="16" /> 订单详情</div>
        <div class="ocf__card-body">
          <div class="ocf__row"><span>房型</span><span class="ocf__row-val">{{ order.room_name }}</span></div>
          <div class="ocf__row"><span>入住</span><span class="ocf__row-val">{{ order.check_in }}</span></div>
          <div class="ocf__row"><span>退房</span><span class="ocf__row-val">{{ order.check_out }}</span></div>
          <div class="ocf__row"><span>入住人</span><span class="ocf__row-val">{{ order.guest_name || '-' }}</span></div>
          <div class="ocf__row" v-if="order.remark"><span>备注</span><span class="ocf__row-val" style="max-width:180px;text-align:right;font-size:12px;color:#888">{{ order.remark }}</span></div>
        </div>
      </div>

      <!-- 费用明细 -->
      <div class="ocf__card">
        <div class="ocf__card-title"><Wallet :size="16" /> 费用明细</div>
        <div class="ocf__card-body">
          <div class="ocf__row"><span>房费 × {{ order.nights || 1 }}晚</span><span>¥{{ order.total_price }}</span></div>
          <div class="ocf__row ocf__row--total"><span>应付金额</span><span class="ocf__total-price">¥{{ order.total_price }}</span></div>
        </div>
      </div>

      <!-- 支付方式 + 支付按钮 -->
      <div class="ocf__card">
        <div class="ocf__card-title"><CreditCard :size="16" /> 支付方式</div>
        <div class="ocf__card-body ocf__pay">
          <Wallet :size="20" class="ocf__pay-icon" />
          <span class="ocf__pay-text">钱包余额支付</span>
          <CircleCheck :size="16" class="ocf__pay-check" />
        </div>
        <div class="ocf__card-body" v-if="order.status === 'pending'">
          <button class="ocf__pay-btn" @click="payNow" :disabled="paying">
            {{ paying ? '支付中...' : `立即支付 ¥${order.total_price}` }}
          </button>
        </div>
        <div class="ocf__card-body" v-else>
          <p class="ocf__pay-done">{{ statusMap[order.status] || order.status }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ClipboardList, Wallet, CreditCard, CircleCheck } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';

const route = useRoute();
const order = ref({});
const loading = ref(true);
const paying = ref(false);

const statusMap = { pending: '待支付', paid: '已支付', confirmed: '已确认' };

onMounted(async () => {
  const id = route.params.id;
  try {
    const res = await api.getOrderDetail(id);
    order.value = res.data || {};
  } catch { /* ignore */ }
  finally { loading.value = false; }
});

async function payNow() {
  paying.value = true;
  try {
    await api.walletPay(order.value.order_no);
    alert('支付成功！');
    const res = await api.getOrderDetail(order.value.id);
    order.value = res.data || {};
  } catch { /* error handled by api */ }
  finally { paying.value = false; }
}
</script>

<style scoped>
.ocf__steps { display: flex; align-items: center; padding: 14px 20px; background: #fff; }
.ocf__step { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ocf__step-num { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
.ocf__step-num--done { background: #1a56db; color: #fff; }
.ocf__step-num--active { background: #1a56db; color: #fff; box-shadow: 0 0 0 3px rgba(26,86,219,.2); }
.ocf__step-label { font-size: 11px; color: #999; }
.ocf__step-label--done { color: #1a56db; }
.ocf__step-label--active { color: #1a56db; font-weight: 600; }
.ocf__step-line { flex: 1; height: 1px; background: #e0e0e0; margin-bottom: 14px; }
.ocf__step-line--done { background: #1a56db; }

.ocf__state { text-align: center; color: #999; padding: 60px 0; }

.ocf__card { background: #fff; margin: 8px 12px; border-radius: 12px; overflow: hidden; }
.ocf__card-title { padding: 14px 16px 10px; font-size: 15px; font-weight: 700; color: #1a1a1a; border-bottom: 1px solid #f5f5f5; }
.ocf__card-body { padding: 14px 16px; }

.ocf__row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; border-bottom: 1px solid #f5f5f5; }
.ocf__row:last-child { border-bottom: 0; }
.ocf__row-val { color: #1a1a1a; font-weight: 600; }
.ocf__row--total { border-bottom: 0; border-top: 1px solid #f0f0f0; padding-top: 10px; margin-top: 4px; font-weight: 700; color: #1a1a1a; }
.ocf__total-price { font-size: 18px; font-weight: 700; color: #ff4d4f; }

.ocf__pay { display: flex; align-items: center; gap: 12px; font-size: 14px; }
.ocf__pay-icon { font-size: 24px; }
.ocf__pay-text { font-weight: 600; flex: 1; }
.ocf__pay-check { color: #1a56db; font-size: 16px; }
.ocf__pay-btn { width: 100%; padding: 14px; background: #ff4d4f; color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; }
.ocf__pay-btn:disabled { opacity: .6; }
.ocf__pay-done { text-align: center; font-size: 16px; font-weight: 600; color: #10b981; }
</style>
