<template>
  <NavBar title="积分商城" />
  <div class="mall">
    <div v-if="loading" class="mall__state">
      <div v-for="i in 3" :key="i" class="skeleton" style="height:180px;margin-bottom:var(--space-sm);border-radius:var(--radius-md)"></div>
    </div>
    <div v-else-if="!products.length" class="mall__state">
      <Gift :size="40" :stroke-width="1" />
      <p>暂无商品</p>
    </div>
    <div v-else class="mall__grid">
      <div v-for="p in products" :key="p.id" class="mall__card" @click="openDetail(p)">
        <img :src="p.image||'/placeholder.jpg'" :alt="p.name" class="mall__img" />
        <div class="mall__body">
          <h3>{{ p.name }}</h3>
          <p v-if="p.description" class="mall__desc">{{ p.description }}</p>
          <div class="mall__footer">
            <span class="mall__points"><Zap :size="12" /> {{ p.points_cost }}积分</span>
            <span class="mall__arrow">→</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 商品详情/兑换弹窗 -->
    <Teleport to="body">
      <Transition name="mall-modal">
        <div v-if="showModal" class="mall__overlay" @click.self="showModal = false">
          <div class="mall__detail">
            <!-- 关闭 -->
            <button class="mall__detail-close" @click="showModal = false">✕</button>

            <!-- Step 1: 商品详情 -->
            <template v-if="step === 1 && curProduct">
              <img :src="curProduct.image||'/placeholder.jpg'" :alt="curProduct.name" class="mall__detail-img" />
              <div class="mall__detail-body">
                <h2 class="mall__detail-name">{{ curProduct.name }}</h2>
                <p v-if="curProduct.description" class="mall__detail-desc">{{ curProduct.description }}</p>
                <div class="mall__detail-points">
                  <Zap :size="18" />
                  <span>{{ curProduct.points_cost }} 积分</span>
                </div>
                <button class="mall__detail-btn" @click="step = 2">立即兑换</button>
              </div>
            </template>

            <!-- Step 2: 填写收货信息 -->
            <template v-if="step === 2">
              <div class="mall__detail-head">
                <button class="mall__detail-back" @click="step = 1">← 返回</button>
                <span class="mall__detail-head-title">填写收货信息</span>
                <span class="mall__detail-head-spacer"></span>
              </div>
              <div class="mall__detail-body">
                <div class="mall__field">
                  <label>收货人</label>
                  <input v-model="addrForm.receiver" placeholder="请输入姓名" />
                </div>
                <div class="mall__field">
                  <label>联系电话</label>
                  <input v-model="addrForm.phone" placeholder="请输入手机号" type="tel" />
                </div>
                <div class="mall__field">
                  <label>收货地址</label>
                  <input v-model="addrForm.address" placeholder="请输入详细地址" />
                </div>
                <button class="mall__detail-btn" @click="confirmExchange" :disabled="exchanging">
                  {{ exchanging ? '兑换中...' : `确认兑换 · ${curProduct?.points_cost || 0}积分` }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Gift, Zap } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';
import { showToast } from '../utils/toast.js';

const products = ref([]);
const loading = ref(true);
const showModal = ref(false);
const step = ref(1);
const exchanging = ref(false);
const curProduct = ref(null);
const addrForm = reactive({ receiver: '', phone: '', address: '' });

onMounted(async () => {
  try { const r = await api.getMallProducts(); products.value = r.data?.list || r.data || []; } catch {}
  finally { loading.value = false; }
});

function openDetail(p) {
  curProduct.value = p;
  addrForm.receiver = '';
  addrForm.phone = '';
  addrForm.address = '';
  step.value = 1;
  showModal.value = true;
}

async function confirmExchange() {
  if (!addrForm.receiver.trim()) return showToast('请填写收货人', 'warning');
  if (!addrForm.phone.trim()) return showToast('请填写联系电话', 'warning');
  if (!addrForm.address.trim()) return showToast('请填写收货地址', 'warning');

  exchanging.value = true;
  try {
    await api.exchangeProduct({
      productId: curProduct.value.id,
      receiver: addrForm.receiver,
      phone: addrForm.phone,
      address: addrForm.address,
    });
    showModal.value = false;
    showToast('兑换成功！', 'success');
  } catch {
    showToast('兑换失败，请重试', 'error');
  } finally {
    exchanging.value = false;
  }
}
</script>

<style scoped>
.mall { padding: 0 var(--space-md); }
.mall__state { text-align: center; color: var(--text-muted); padding: 60px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.mall__grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); padding-top: var(--space-sm); }

/* ═══ 卡片 ═══ */
.mall__card {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); overflow: hidden; cursor: pointer;
  transition: all var(--dur-normal) var(--ease-out);
}
.mall__card:hover { border-color: var(--border-glow); }
.mall__card:active { transform: scale(.98); }
.mall__img { width: 100%; height: 130px; object-fit: cover; background: rgba(255,255,255,.02); display: block; }
.mall__body { padding: 10px 12px 12px; }
.mall__body h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.mall__desc {
  font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.mall__footer { display: flex; justify-content: space-between; align-items: center; }
.mall__points { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; font-weight: 600; color: var(--neon-gold); }
.mall__arrow { font-size: 14px; color: var(--text-muted); }

/* ═══ 弹窗遮罩 ═══ */
.mall__overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0, 0, 0, .6); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
}

/* ═══ 详情卡片 ═══ */
.mall__detail {
  width: 100%; max-width: 480px; max-height: 85vh;
  background: var(--bg-primary);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  overflow-y: auto; position: relative;
}
.mall__detail-close {
  position: absolute; top: 12px; right: 12px; z-index: 2;
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(0,0,0,.4); color: #fff;
  font-size: 16px; border: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

/* ═══ Step 1: 商品大图 + 信息 ═══ */
.mall__detail-img { width: 100%; height: 220px; object-fit: cover; display: block; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
.mall__detail-body { padding: var(--space-lg) var(--space-md); }
.mall__detail-name { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-sm); }
.mall__detail-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: var(--space-lg); }
.mall__detail-points {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--radius-full);
  background: rgba(245, 158, 11, .1); color: var(--neon-gold);
  font-size: 18px; font-weight: 700; margin-bottom: var(--space-lg);
}
.mall__detail-btn {
  width: 100%; padding: 14px; border: 0; border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff; font-size: 16px; font-weight: 600; cursor: pointer;
  transition: opacity var(--dur-fast);
}
.mall__detail-btn:active { opacity: .85; }
.mall__detail-btn:disabled { opacity: .6; }

/* ═══ Step 2: 地址表单 ═══ */
.mall__detail-head {
  display: flex; align-items: center; padding: var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
}
.mall__detail-back {
  font-size: 14px; color: var(--neon-cyan); background: none; border: 0; cursor: pointer; padding: 4px 0;
}
.mall__detail-head-title { flex: 1; text-align: center; font-size: 15px; font-weight: 600; color: var(--text-primary); }
.mall__detail-head-spacer { width: 56px; }

.mall__field { margin-bottom: var(--space-md); }
.mall__field label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.mall__field input {
  width: 100%; height: 44px; padding: 0 12px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; outline: 0;
  transition: border-color var(--dur-fast);
}
.mall__field input:focus { border-color: var(--border-glow); }
.mall__field input::placeholder { color: var(--text-muted); }

/* ═══ 弹窗动画 ═══ */
.mall-modal-enter-active,
.mall-modal-leave-active { transition: all .25s var(--ease-out); }
.mall-modal-enter-from .mall__overlay,
.mall-modal-leave-to .mall__overlay { opacity: 0; }
.mall-modal-enter-from .mall__detail,
.mall-modal-leave-to .mall__detail { transform: translateY(100%); }
</style>
