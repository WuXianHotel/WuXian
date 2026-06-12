<template>
  <div class="home">
    <!-- 头部 -->
    <header class="home__header">
      <div class="home__header-content">
        <h1 class="home__hotel-name">柳州无限电竞酒店</h1>
        <p class="home__slogan">电竞与舒适的完美融合</p>
      </div>
    </header>

    <!-- 快捷入口 -->
    <section class="home__quick">
      <div class="home__quick-item" @click="goRooms">
        <span class="home__quick-icon">🏨</span>
        <span class="home__quick-label">客房预订</span>
      </div>
      <div class="home__quick-item" @click="goProfile">
        <span class="home__quick-icon">👤</span>
        <span class="home__quick-label">我的</span>
      </div>
      <div class="home__quick-item" @click="goOrders">
        <span class="home__quick-icon">📋</span>
        <span class="home__quick-label">订单</span>
      </div>
      <div class="home__quick-item" @click="goMall">
        <span class="home__quick-icon">🎁</span>
        <span class="home__quick-label">积分商城</span>
      </div>
    </section>

    <!-- 推荐房型 -->
    <section class="home__section">
      <h2 class="home__section-title">推荐房型</h2>
      <div v-if="loading" class="home__loading">加载中...</div>
      <div v-else class="home__room-list">
        <div
          v-for="room in rooms"
          :key="room.id"
          class="home__room-card"
          @click="goRoomDetail(room.id)"
        >
          <img
            :src="room.image_url || '/placeholder.jpg'"
            :alt="room.name"
            class="home__room-img"
          />
          <div class="home__room-info">
            <h3 class="home__room-name">{{ room.name }}</h3>
            <p class="home__room-desc">{{ room.description || '舒适电竞房型' }}</p>
            <div class="home__room-bottom">
              <span class="home__room-price">¥{{ room.price }}/晚</span>
              <span class="home__room-tag" v-if="room.available">可预订</span>
              <span class="home__room-tag home__room-tag--full" v-else>满房</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const rooms = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { getRooms } = await import('../utils/api.js');
    const res = await getRooms();
    rooms.value = (res.data || []).slice(0, 6);
  } catch {
    // 获取失败显示空列表
  } finally {
    loading.value = false;
  }
});

function goRooms() { router.push('/rooms'); }
function goProfile() { router.push('/profile'); }
function goOrders() { router.push('/orders'); }
function goMall() { router.push('/mall'); }
function goRoomDetail(id) { router.push(`/room/${id}`); }
</script>

<style scoped>
.home__header {
  background: linear-gradient(135deg, #1a56db, #2563eb);
  color: #fff;
  padding: 30px 20px 36px;
}
.home__hotel-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}
.home__slogan {
  font-size: 13px;
  opacity: .85;
}
.home__quick {
  display: flex;
  background: #fff;
  border-radius: 12px;
  margin: -16px 16px 20px;
  padding: 16px 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, .08);
}
.home__quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.home__quick-icon {
  font-size: 28px;
}
.home__quick-label {
  font-size: 12px;
  color: #666;
}
.home__section {
  padding: 0 16px 20px;
}
.home__section-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 12px;
}
.home__loading {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
.home__room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.home__room-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .06);
  cursor: pointer;
}
.home__room-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  background: #eee;
}
.home__room-info {
  padding: 12px 14px 14px;
}
.home__room-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.home__room-desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 10px;
}
.home__room-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.home__room-price {
  font-size: 18px;
  font-weight: 700;
  color: #1a56db;
}
.home__room-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #e6f0ff;
  color: #1a56db;
}
.home__room-tag--full {
  background: #f5f5f5;
  color: #999;
}
</style>
