<template>
  <div class="rooms">
    <header class="rooms__header">
      <h1 class="rooms__title">探索房型</h1>
    </header>
    <div v-if="loading" class="rooms__loading">加载中...</div>
    <div v-else class="rooms__grid">
      <div
        v-for="room in rooms"
        :key="room.id"
        class="rooms__card"
        @click="goDetail(room.id)"
      >
        <img :src="room.image_url || '/placeholder.jpg'" :alt="room.name" class="rooms__img" />
        <div class="rooms__info">
          <h3 class="rooms__name">{{ room.name }}</h3>
          <p class="rooms__desc">{{ room.description || '' }}</p>
          <div class="rooms__bottom">
            <span class="rooms__price">¥{{ room.price }}/晚</span>
            <span class="rooms__book-btn">预订</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!loading && !rooms.length" class="rooms__empty">暂无房型</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../utils/api.js';

const router = useRouter();
const rooms = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await api.getRooms();
    rooms.value = res.data || [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

function goDetail(id) { router.push(`/room/${id}`); }
</script>

<style scoped>
.rooms__header {
  padding: 20px 16px 12px;
  background: #fff;
}
.rooms__title {
  font-size: 20px;
  font-weight: 700;
}
.rooms__loading, .rooms__empty {
  text-align: center;
  color: #999;
  padding: 60px 0;
}
.rooms__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px 12px 20px;
}
.rooms__card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .06);
  cursor: pointer;
}
.rooms__img {
  width: 100%;
  height: 130px;
  object-fit: cover;
  background: #eee;
}
.rooms__info {
  padding: 10px 12px 12px;
}
.rooms__name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}
.rooms__desc {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rooms__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rooms__price {
  font-size: 15px;
  font-weight: 700;
  color: #1a56db;
}
.rooms__book-btn {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  background: #1a56db;
  color: #fff;
}
</style>
