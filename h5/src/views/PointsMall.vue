<template>
  <div class="mall">
    <NavBar title="积分商城" />
    <div v-if="loading" class="mall__state"><div v-for="i in 3" :key="i" class="skeleton" style="height:180px;margin-bottom:10px;border-radius:14px"></div></div>
    <div v-else-if="!products.length" class="mall__state"><Gift :size="40" :stroke-width="1" /><p>暂无商品</p></div>
    <div v-else class="mall__grid">
      <div v-for="p in products" :key="p.id" class="mall__card">
        <img :src="p.image||'/placeholder.jpg'" :alt="p.name" class="mall__img" />
        <div class="mall__body">
          <h3>{{ p.name }}</h3>
          <div class="mall__footer">
            <span class="mall__points"><Zap :size="12" /> {{ p.points_cost }}积分</span>
            <button @click="exchange(p)">兑换</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Gift, Zap } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';
import { showToast } from '../utils/toast.js';
import { showConfirm } from '../utils/confirm.js';

const products=ref([]),loading=ref(true);
onMounted(async()=>{try{const r=await api.getMallProducts();products.value=r.data?.list||r.data||[];}catch{}finally{loading.value=false;}});
async function exchange(p){
  const ok = await showConfirm('确认兑换', `使用 ${p.points_cost} 积分兑换「${p.name}」？`);
  if(!ok) return;
  try{await api.exchangeProduct({productId:p.id});showToast('兑换成功!','success');}catch{showToast('兑换失败，请重试','error')}
}
</script>

<style scoped>
.mall{padding:0 14px}
.mall__state{text-align:center;color:var(--text-muted);padding:60px 0;display:flex;flex-direction:column;align-items:center;gap:12px}
.mall__grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:12px}
.mall__card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);overflow:hidden;transition:all var(--dur-normal) var(--ease-out)}
.mall__card:hover{border-color:var(--border-glow)}
.mall__img{width:100%;height:130px;object-fit:cover;background:rgba(255,255,255,.02)}
.mall__body{padding:10px 12px 12px}
.mall__body h3{font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:8px}
.mall__footer{display:flex;justify-content:space-between;align-items:center}
.mall__points{display:inline-flex;align-items:center;gap:3px;font-size:13px;font-weight:600;color:var(--neon-gold)}
.mall__footer button{padding:4px 12px;border-radius:var(--radius-full);font-size:12px;background:var(--neon-gold);color:#000;font-weight:600}
</style>
