<template>
  <div class="orders">
    <h1 class="orders__title">我的订单</h1>

    <div class="orders__tabs">
      <span v-for="t in tabs" :key="t.key" class="orders__tab" :class="{'orders__tab--active':activeTab===t.key}" @click="activeTab=t.key;loadOrders()">{{ t.label }}</span>
    </div>

    <div v-if="loading" class="orders__skeleton">
      <div v-for="i in 3" :key="i" class="skeleton" style="height:80px;margin-bottom:10px;border-radius:14px"></div>
    </div>
    <div v-else-if="!list.length" class="orders__empty">暂无订单</div>
    <div v-else class="orders__list">
      <div v-for="(item,idx) in list" :key="item.id||item.order_no" class="order-card fade-in-up" :style="{animationDelay:idx*.07+'s'}" @click="go(item.order_no)">
        <img :src="(item.room_images && item.room_images[0]) || '/placeholder.jpg'" :alt="item.room_name" class="order-card__img" />
        <div class="order-card__info">
          <h3>{{ item.room_name }}</h3>
          <p class="order-card__date">{{ item.check_in_date }} ~ {{ item.check_out_date }}</p>
          <div class="order-card__footer">
            <span class="order-card__price">¥{{ item.pay_amount }}</span>
            <span class="order-card__status" :style="{color:statusColor(item.status)}">{{ statusMap[item.status]||item.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../utils/api.js';

const router = useRouter();
const loading=ref(true), activeTab=ref('all'), list=ref([]);
const tabs=[{key:'all',label:'全部'},{key:'pending_payment',label:'待支付'},{key:'pending_checkin',label:'待入住'},{key:'completed',label:'已完成'}];
const statusMap={0:'待支付',1:'待入住',2:'入住中',3:'已退房',4:'已取消',5:'退款中',6:'已退款'};
const statusColor=s=> ({0:'var(--neon-gold)',1:'var(--neon-cyan)',2:'var(--neon-purple)',3:'var(--text-muted)',4:'var(--text-muted)',5:'var(--neon-gold)',6:'var(--text-muted)'}[s]||'var(--text-muted)');

onMounted(()=>{loadOrders();});
async function loadOrders(){
  loading.value=true;
  try{ const p=activeTab.value!=='all'?{status:activeTab.value}:{}; const r=await api.getOrders(p); list.value=r.data?.list||[]; }catch{}
  finally{loading.value=false;}
}
function go(orderNo){ router.push(`/order/${orderNo}`); }
</script>

<style scoped>
.orders__title { padding: 20px 16px 8px; font-size: 22px; font-weight: 800; color: var(--text-primary); }
.orders__tabs { display: flex; gap: 8px; padding: 0 16px 14px; }
.orders__tab {
  font-size: 13px; padding: 6px 16px; border-radius: var(--radius-full);
  background: var(--bg-card); color: var(--text-muted); cursor: pointer; border: 1px solid var(--border-subtle);
  transition: all var(--dur-fast);
}
.orders__tab--active { background: rgba(0,212,255,.1); color: var(--neon-cyan); border-color: var(--border-glow); }
.orders__skeleton { padding: 0 14px; }
.orders__empty { text-align: center; color: var(--text-muted); padding: 60px 0; }
.orders__list { padding: 0 14px 20px; display: flex; flex-direction: column; gap: 10px; }
.order-card {
  display: flex; gap: 12px; padding: 12px;
  background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
  cursor: pointer; transition: all var(--dur-normal) var(--ease-out);
}
.order-card:hover { border-color: var(--border-glow); }
.order-card__img { width: 80px; height: 80px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; background: rgba(255,255,255,.03); }
.order-card__info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.order-card__info h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.order-card__date { font-size: 12px; color: var(--text-muted); }
.order-card__footer { display: flex; justify-content: space-between; align-items: center; }
.order-card__price { font-size: 17px; font-weight: 700; color: var(--neon-cyan); }
.order-card__status { font-size: 12px; font-weight: 600; }
</style>
