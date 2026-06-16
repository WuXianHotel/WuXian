<template>
  <div class="mall">
    <NavBar title="积分商城" />
    <div v-if="loading" class="mall__state"><div v-for="i in 3" :key="i" class="skeleton" style="height:180px;margin-bottom:var(--space-sm);border-radius:var(--radius-md)"></div></div>
    <div v-else-if="!products.length" class="mall__state"><Gift :size="40" :stroke-width="1" /><p>暂无商品</p></div>
    <div v-else class="mall__grid">
      <div v-for="p in products" :key="p.id" class="mall__card">
        <img :src="p.image||'/placeholder.jpg'" :alt="p.name" class="mall__img" />
        <div class="mall__body">
          <h3>{{ p.name }}</h3>
          <p v-if="p.description" class="mall__desc">{{ p.description }}</p>
          <div class="mall__footer">
            <span class="mall__points"><Zap :size="12" /> {{ p.points_cost }}积分</span>
            <button @click="exchange(p)">兑换</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 收货地址表单（实物商品） -->
    <Teleport to="body">
      <Transition name="mall-sheet">
        <div v-if="showAddress" class="mall__overlay" @click.self="showAddress = false">
          <div class="mall__sheet">
            <div class="mall__sheet-head">
              <h3>填写收货信息</h3>
              <button @click="showAddress = false" class="mall__sheet-close">✕</button>
            </div>
            <div class="mall__sheet-body">
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
            </div>
            <button class="mall__sheet-btn" @click="confirmExchange" :disabled="exchanging">
              {{ exchanging ? '兑换中...' : `确认兑换 · ${exchProduct?.points_cost || 0}积分` }}
            </button>
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
import { showConfirm } from '../utils/confirm.js';

const products = ref([]);
const loading = ref(true);
const showAddress = ref(false);
const exchanging = ref(false);
const exchProduct = ref(null);
const addrForm = reactive({ receiver: '', phone: '', address: '' });

onMounted(async () => {
  try { const r = await api.getMallProducts(); products.value = r.data?.list || r.data || []; } catch {}
  finally { loading.value = false; }
});

async function exchange(p) {
  const ok = await showConfirm('确认兑换', `使用 ${p.points_cost} 积分兑换「${p.name}」？`);
  if (!ok) return;

  // 统一弹出收货地址表单
  exchProduct.value = p;
  addrForm.receiver = '';
  addrForm.phone = '';
  addrForm.address = '';
  showAddress.value = true;
}

async function confirmExchange() {
  if (!addrForm.receiver.trim()) return showToast('请填写收货人', 'warning');
  if (!addrForm.phone.trim()) return showToast('请填写联系电话', 'warning');
  if (!addrForm.address.trim()) return showToast('请填写收货地址', 'warning');
  await doExchange(exchProduct.value.id, addrForm.receiver, addrForm.phone, addrForm.address);
}

async function doExchange(productId, receiver, phone, address) {
  exchanging.value = true;
  try {
    await api.exchangeProduct({ productId, receiver, phone, address });
    showAddress.value = false;
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
.mall__card {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); overflow: hidden;
  transition: all var(--dur-normal) var(--ease-out);
}
.mall__card:hover { border-color: var(--border-glow); }
.mall__img { width: 100%; height: 130px; object-fit: cover; background: rgba(255,255,255,.02); }
.mall__body { padding: 10px 12px 12px; }
.mall__body h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.mall__desc { font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mall__footer { display: flex; justify-content: space-between; align-items: center; }
.mall__points { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; font-weight: 600; color: var(--neon-gold); }
.mall__footer button {
  padding: 4px 12px; border-radius: var(--radius-full); border: 0;
  font-size: 12px; background: var(--neon-gold); color: #000; font-weight: 600; cursor: pointer;
}

/* ═══ 地址表单底部弹窗 ═══ */
.mall__overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0, 0, 0, .5);
  display: flex; align-items: flex-end; justify-content: center;
}
.mall__sheet {
  width: 100%; max-width: 480px; max-height: 75vh;
  background: var(--bg-primary);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  display: flex; flex-direction: column;
}
.mall__sheet-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
}
.mall__sheet-head h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.mall__sheet-close {
  font-size: 18px; color: var(--text-muted); background: none; border: 0; cursor: pointer; padding: 4px;
}
.mall__sheet-body { padding: var(--space-md); flex: 1; overflow-y: auto; }
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
.mall__sheet-btn {
  margin: 0 var(--space-md); padding: 14px;
  border: 0; border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
}
.mall__sheet-btn:disabled { opacity: .6; }

/* 弹窗动画 */
.mall-sheet-enter-active,
.mall-sheet-leave-active { transition: all .25s var(--ease-out); }
.mall-sheet-enter-from .mall__overlay,
.mall-sheet-leave-to .mall__overlay { opacity: 0; }
.mall-sheet-enter-from .mall__sheet,
.mall-sheet-leave-to .mall__sheet { transform: translateY(100%); }
</style>
