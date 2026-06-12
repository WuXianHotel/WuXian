<template>
  <div class="mall">
    <NavBar title="积分商城" />
    <header class="mall__header"><h2 class="mall__title">积分商城</h2></header>
    <div v-if="loading" class="mall__loading">加载中...</div>
    <div v-else-if="!products.length" class="mall__empty">暂无商品</div>
    <div v-else class="mall__grid">
      <div v-for="p in products" :key="p.id" class="mall__card">
        <img :src="p.image_url || '/placeholder.jpg'" :alt="p.name" class="mall__img" />
        <div class="mall__info">
          <h3 class="mall__name">{{ p.name }}</h3>
          <div class="mall__bottom">
            <span class="mall__points">{{ p.points }} 积分</span>
            <button class="mall__btn" @click="exchange(p)">兑换</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import NavBar from '../components/NavBar.vue';
import api from '../utils/api.js';

const products = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await api.getMallProducts();
    products.value = res.data || [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

async function exchange(product) {
  if (!confirm(`确认使用 ${product.points} 积分兑换 "${product.name}"？`)) return;
  try {
    await api.exchangeProduct({ productId: product.id });
    alert('兑换成功！');
  } catch {
    // error handled by api
  }
}
</script>

<style scoped>
.mall__header { padding: 16px; }
.mall__title { font-size: 18px; font-weight: 700; }
.mall__loading, .mall__empty { text-align: center; color: #999; padding: 60px 0; }
.mall__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 12px 20px; }
.mall__card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 6px rgba(0, 0, 0, .06); }
.mall__img { width: 100%; height: 130px; object-fit: cover; background: #eee; }
.mall__info { padding: 10px 12px 12px; }
.mall__name { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.mall__bottom { display: flex; justify-content: space-between; align-items: center; }
.mall__points { font-size: 14px; font-weight: 600; color: #f59e0b; }
.mall__btn { font-size: 12px; padding: 4px 12px; border-radius: 4px; background: #f59e0b; color: #fff; border: none; }
</style>
