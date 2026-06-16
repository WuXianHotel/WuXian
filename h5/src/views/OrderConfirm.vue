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
    <template v-else-if="order.order_no">
      <!-- 订单详情 -->
      <div class="ocf__card">
        <div class="ocf__card-title"><ClipboardList :size="16" /> 订单详情</div>
        <div class="ocf__card-body">
          <div class="ocf__row"><span>房型</span><span class="ocf__row-val">{{ order.room_name }}</span></div>
          <div class="ocf__row"><span>入住</span><span class="ocf__row-val">{{ order.check_in_date }}</span></div>
          <div class="ocf__row"><span>退房</span><span class="ocf__row-val">{{ order.check_out_date }}</span></div>
          <div class="ocf__row"><span>入住人</span><span class="ocf__row-val">{{ order.guestName || order.guest_name || '-' }}</span></div>
        </div>
      </div>

      <!-- 费用明细 -->
      <div class="ocf__card">
        <div class="ocf__card-title"><Wallet :size="16" /> 费用明细</div>
        <div class="ocf__card-body">
          <div class="ocf__row"><span>房费 × {{ order.nights || 1 }}晚</span><span>¥{{ order.pay_amount }}</span></div>
          <div class="ocf__row ocf__row--total"><span>应付金额</span><span class="ocf__total-price">¥{{ order.pay_amount }}</span></div>
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
        <div class="ocf__card-body" v-if="order.status === 0">
          <button class="ocf__pay-btn" @click="payNow" :disabled="paying">
            {{ paying ? '支付中...' : `立即支付 ¥${order.pay_amount}` }}
          </button>
        </div>
        <div class="ocf__card-body" v-else>
          <p class="ocf__pay-done">{{ statusMap[order.status] || order.status }}</p>
        </div>
      </div>
    </template>
  </div>

  <!-- 积分/升级弹窗 -->
  <NotifyPopup
    :visible="showNotify"
    :points-earned="notifyPoints"
    :level-up="notifyLevelUp"
    @close="showNotify = false"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ClipboardList, Wallet, CreditCard, CircleCheck } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import NotifyPopup from '../components/NotifyPopup.vue';
import api from '../utils/api.js';
import { showToast } from '../utils/toast.js';

const route = useRoute();
const order = ref({});
const loading = ref(true);
const paying = ref(false);

const showNotify = ref(false);
const notifyPoints = ref(0);
const notifyLevelUp = ref(null);

const statusMap = { 0: '待支付', 1: '待入住', 2: '入住中', 3: '已退房', 4: '已取消', 5: '退款中', 6: '已退款' };

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
    const payRes = await api.walletPay(order.value.order_no);
    const data = payRes.data || {};

    // 弹窗显示积分/升级
    notifyPoints.value = data.pointsEarned || 0;
    notifyLevelUp.value = data.levelUp || null;

    if (notifyPoints.value > 0 || notifyLevelUp.value) {
      showNotify.value = true;
    } else {
      showToast('支付成功！', 'success');
    }

    const res = await api.getOrderDetail(order.value.order_no);
    order.value = res.data || {};
  } catch { /* error handled by api */ }
  finally { paying.value = false; }
}
</script>

<style scoped>
.ocf__steps { display: flex; align-items: center; padding: 14px 20px; background: var(--bg-card); border-bottom: 1px solid var(--border-subtle); }
.ocf__step { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ocf__step-num { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
.ocf__step-num--done { background: var(--neon-cyan); color: var(--bg-deep); }
.ocf__step-num--active { background: var(--neon-cyan); color: var(--bg-deep); box-shadow: 0 0 0 3px rgba(0,212,255,.2); }
.ocf__step-label { font-size: 11px; color: var(--text-muted); }
.ocf__step-label--done { color: var(--neon-cyan); }
.ocf__step-label--active { color: var(--neon-cyan); font-weight: 600; }
.ocf__step-line { flex: 1; height: 1px; background: var(--border-subtle); margin-bottom: 14px; }
.ocf__step-line--done { background: var(--neon-cyan); }

.ocf__state { text-align: center; color: var(--text-muted); padding: 60px 0; }

.ocf__card { background: var(--bg-card); margin: 8px 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
.ocf__card-title { padding: 14px 16px 10px; font-size: 15px; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 8px; }
.ocf__card-body { padding: 14px 16px; }

.ocf__row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
.ocf__row:last-child { border-bottom: 0; }
.ocf__row-val { color: var(--text-primary); font-weight: 600; }
.ocf__row--total { border-bottom: 0; border-top: 1px solid var(--border-subtle); padding-top: 10px; margin-top: 4px; font-weight: 700; color: var(--text-primary); }
.ocf__total-price { font-size: 18px; font-weight: 700; color: var(--neon-cyan); }

.ocf__pay { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--text-primary); }
.ocf__pay-icon { color: var(--neon-cyan); }
.ocf__pay-text { font-weight: 600; flex: 1; }
.ocf__pay-check { color: var(--neon-cyan); }
.ocf__pay-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)); color: #fff; border: none; border-radius: var(--radius-md); font-size: 16px; font-weight: 600; }
.ocf__pay-btn:disabled { opacity: .6; }
.ocf__pay-done { text-align: center; font-size: 16px; font-weight: 600; color: var(--neon-green); }
</style>
