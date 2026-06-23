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
        <!-- 支付方式选择 -->
        <div class="ocf__pay-methods">
          <label
            :class="['ocf__pay-method', { 'ocf__pay-method--active': payMethod === 'wechat' }]"
            @click="payMethod = 'wechat'"
          >
            <span class="ocf__pay-method-icon ocf__pay-method-icon--wechat">微信</span>
            <span class="ocf__pay-method-text">微信支付</span>
            <CircleCheck v-if="payMethod === 'wechat'" :size="16" class="ocf__pay-check" />
          </label>
          <label
            :class="['ocf__pay-method', { 'ocf__pay-method--active': payMethod === 'wallet' }]"
            @click="payMethod = 'wallet'"
          >
            <Wallet :size="20" class="ocf__pay-method-icon" />
            <span class="ocf__pay-method-text">钱包余额支付</span>
            <CircleCheck v-if="payMethod === 'wallet'" :size="16" class="ocf__pay-check" />
          </label>
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
    @close="onNotifyClose"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ClipboardList, Wallet, CreditCard, CircleCheck } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import NotifyPopup from '../components/NotifyPopup.vue';
import api from '../utils/api.js';
import { showToast } from '../utils/toast.js';

const route = useRoute();
const router = useRouter();
const order = ref({});
const loading = ref(true);
const paying = ref(false);
const payMethod = ref('wechat');

const showNotify = ref(false);
const notifyPoints = ref(0);
const notifyLevelUp = ref(null);

const statusMap = { 0: '待支付', 1: '待入住', 2: '入住中', 3: '已退房', 4: '已取消', 5: '退款中', 6: '已退款' };

let pollTimer = null;

function onHashChange() {
  consumePayResultIfAny();
}

onMounted(async () => {
  const id = route.params.id;
  try {
    const res = await api.getOrderDetail(id);
    order.value = res.data || {};
  } catch { /* ignore */ }
  finally { loading.value = false; }

  // 首次进入：URL hash 里若已带 payResult（小程序回来后立即 setData 注入），消费它
  consumePayResultIfAny();
  window.addEventListener('hashchange', onHashChange);

  // 兼容旧逻辑：如果还有 pendingPayOrderNo（异常路径），轮询一次
  const pendingOrderNo = sessionStorage.getItem('pendingPayOrderNo');
  if (pendingOrderNo && pendingOrderNo === order.value?.order_no) {
    pollPayStatus(pendingOrderNo);
  }
});

onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer);
  window.removeEventListener('hashchange', onHashChange);
});

function onNotifyClose() {
  showNotify.value = false;
  router.replace(`/order/${order.value.order_no}`);
}

async function payNow() {
  if (payMethod.value === 'wechat') {
    return wechatPayNow();
  }
  return walletPayNow();
}

// 微信支付
// 注意：postMessage 只在页面退出/分享时才送达小程序，无法实时拉起支付，
// 所以这里改为 navigateTo 跳转到小程序支付中转页 /pages/test/test，
// 由原生页面调用 wx.requestPayment。支付结果回到 H5 时通过 URL hash 下发。
async function wechatPayNow() {
  paying.value = true;
  try {
    const payRes = await api.wechatPay(order.value.order_no);
    const payParams = payRes.data || {};

    const orderNo = order.value.order_no;
    sessionStorage.setItem('pendingPayOrderNo', orderNo);

    if (typeof wx !== 'undefined' && wx.miniProgram) {
      // 仅透传 wx.requestPayment 所需字段（appId 在小程序内自动取）
      const payload = {
        timeStamp: String(payParams.timeStamp),
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType || 'RSA',
        paySign: payParams.paySign,
      };
      const url = `/pages/test/test?p=${encodeURIComponent(JSON.stringify(payload))}&orderNo=${encodeURIComponent(orderNo)}`;
      wx.miniProgram.navigateTo({ url });
    } else {
      showToast('微信支付仅在小程序中可用', 'error');
      sessionStorage.removeItem('pendingPayOrderNo');
    }
  } catch {
    sessionStorage.removeItem('pendingPayOrderNo');
  }
  finally { paying.value = false; }
}

// 监听支付结果回传（小程序通过修改 web-view URL hash 通知 H5）
function parsePayResultFromHash() {
  const hash = window.location.hash || '';
  if (!hash.includes('payResult=')) return null;
  const params = {};
  hash.replace(/^#/, '').split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    params[k] = decodeURIComponent(v || '');
  });
  return params;
}

function consumePayResultIfAny() {
  const r = parsePayResultFromHash();
  if (!r || !r.payResult) return;
  // 清理 hash 防止重复触发
  history.replaceState(null, '', window.location.pathname + window.location.search);
  const pendingOrderNo = sessionStorage.getItem('pendingPayOrderNo');
  if (r.orderNo && pendingOrderNo === r.orderNo) {
    if (r.payResult === 'success') {
      showToast('支付成功', 'success');
      pollPayStatus(r.orderNo); // 兜底校验后端订单状态
    } else if (r.payResult === 'cancel') {
      showToast('已取消支付', 'warning');
      sessionStorage.removeItem('pendingPayOrderNo');
    } else {
      showToast('支付失败，请重试', 'error');
      sessionStorage.removeItem('pendingPayOrderNo');
    }
  }
}

// 轮询支付状态（支付回调异步，轮询最多30秒）
function pollPayStatus(orderNo) {
  let attempts = 0;
  const maxAttempts = 30;

  function check() {
    if (attempts >= maxAttempts) {
      sessionStorage.removeItem('pendingPayOrderNo');
      return;
    }
    attempts++;
    api.getPayStatus(orderNo).then(res => {
      const status = res.data || {};
      if (status.payStatus === 1) {
        sessionStorage.removeItem('pendingPayOrderNo');
        handlePaySuccess();
      } else {
        pollTimer = setTimeout(check, 1000);
      }
    }).catch(() => {
      pollTimer = setTimeout(check, 1000);
    });
  }
  check();
}

// 支付成功处理
function handlePaySuccess() {
  showToast('支付成功！', 'success');
  setTimeout(() => {
    router.replace(`/order/${order.value.order_no}`);
  }, 1200);
}

// 钱包余额支付
async function walletPayNow() {
  paying.value = true;
  try {
    const payRes = await api.walletPay(order.value.order_no);
    const data = payRes.data || {};

    notifyPoints.value = data.pointsEarned || 0;
    notifyLevelUp.value = data.levelUp || null;

    if (notifyPoints.value > 0 || notifyLevelUp.value) {
      showNotify.value = true;
    } else {
      showToast('支付成功！', 'success');
      router.replace(`/order/${order.value.order_no}`);
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

.ocf__pay-methods { display: flex; gap: 10px; padding: 0 16px 12px; }
.ocf__pay-method {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md); cursor: pointer; transition: border-color .2s;
}
.ocf__pay-method--active { border-color: var(--neon-cyan); background: rgba(0,212,255,.05); }
.ocf__pay-method-icon { color: var(--neon-cyan); flex-shrink: 0; }
.ocf__pay-method-icon--wechat {
  width: 28px; height: 28px; border-radius: 6px; background: #07c160;
  color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.ocf__pay-method-text { font-size: 13px; font-weight: 600; color: var(--text-primary); flex: 1; }
.ocf__pay-check { color: var(--neon-cyan); flex-shrink: 0; }
</style>
