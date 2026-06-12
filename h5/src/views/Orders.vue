<template>
  <div class="orders">
    <header class="orders__header">
      <h1 class="orders__title">我的订单</h1>
    </header>
    <!-- 标签切换 -->
    <div class="orders__tabs">
      <span
        v-for="t in tabs"
        :key="t.key"
        class="orders__tab"
        :class="{ 'orders__tab--active': activeTab === t.key }"
        @click="activeTab = t.key; loadOrders()"
      >{{ t.label }}</span>
    </div>
    <div v-if="loading" class="orders__loading">加载中...</div>
    <div v-else-if="!list.length" class="orders__empty">暂无订单</div>
    <div v-else class="orders__list">
      <div
        v-for="item in list"
        :key="item.id"
        class="orders__card"
        @click="goDetail(item.id)"
      >
        <img :src="item.room_image || '/placeholder.jpg'" :alt="item.room_name" class="orders__img" />
        <div class="orders__info">
          <h3 class="orders__name">{{ item.room_name }}</h3>
          <p class="orders__date">{{ item.check_in }} ~ {{ item.check_out }}</p>
          <div class="orders__bottom">
            <span class="orders__price">¥{{ item.total_price }}</span>
            <span class="orders__status" :style="{ color: statusColor(item.status) }">{{ statusMap[item.status] || item.status }}</span>
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
const loading = ref(true);
const activeTab = ref('all');
const list = ref([]);

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'confirmed', label: '已确认' },
  { key: 'completed', label: '已完成' },
];

const statusMap = {
  pending: '待支付',
  paid: '已支付',
  confirmed: '已确认',
  checked_in: '已入住',
  completed: '已完成',
  cancelled: '已取消',
};

function statusColor(status) {
  const colors = { pending: '#f59e0b', paid: '#10b981', confirmed: '#3b82f6', checked_in: '#8b5cf6', completed: '#6b7280', cancelled: '#ef4444' };
  return colors[status] || '#999';
}

onMounted(() => { loadOrders(); });

async function loadOrders() {
  loading.value = true;
  try {
    const params = activeTab.value !== 'all' ? { status: activeTab.value } : {};
    const res = await api.getOrders(params);
    list.value = res.data || [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

function goDetail(id) { router.push(`/order/${id}`); }
</script>

<style scoped>
.orders__header {
  padding: 20px 16px 12px;
  background: #fff;
}
.orders__title { font-size: 20px; font-weight: 700; }
.orders__tabs {
  display: flex;
  background: #fff;
  padding: 0 16px 12px;
  gap: 8px;
}
.orders__tab {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 20px;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  transition: .2s;
}
.orders__tab--active {
  background: #1a56db;
  color: #fff;
}
.orders__loading, .orders__empty { text-align: center; color: #999; padding: 60px 0; }
.orders__list { padding: 0 12px 20px; display: flex; flex-direction: column; gap: 10px; }
.orders__card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .06);
  cursor: pointer;
  display: flex;
}
.orders__img { width: 100px; height: 100px; object-fit: cover; background: #eee; flex-shrink: 0; }
.orders__info { flex: 1; padding: 10px 12px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.orders__name { font-size: 15px; font-weight: 600; }
.orders__date { font-size: 12px; color: #999; }
.orders__bottom { display: flex; justify-content: space-between; align-items: center; }
.orders__price { font-size: 16px; font-weight: 700; color: #1a56db; }
.orders__status { font-size: 12px; font-weight: 500; }
</style>
