<template>
  <div class="rooms">
    <div class="rooms__top-bar">
      <h1 class="rooms__title">选择房型</h1>
    </div>

    <!-- 结果计数 -->
    <div class="rooms__count" v-if="!loading">共找到 <strong>{{ rooms.length }}</strong> 种房型</div>

    <div v-if="loading" class="rooms__state">加载中...</div>
    <div v-else-if="!rooms.length" class="rooms__state">暂无可用房型</div>

    <!-- 房型卡片列表 -->
    <div v-else class="rooms__list">
      <div
        v-for="room in rooms"
        :key="room.id"
        class="room-card"
      >
        <div class="room-card__photo" @click="goDetail(room.id)">
          <img v-if="room.image_url" :src="room.image_url" :alt="room.name" class="room-card__photo-img" />
          <div v-else class="room-card__photo room-card__photo--placeholder">🛏️</div>
          <span v-if="room.is_hot" class="room-card__badge room-card__badge--hot">热销</span>
          <span v-else-if="room.room_type === 'suite'" class="room-card__badge room-card__badge--suite">套房</span>
        </div>

        <div class="room-card__body" @click="goDetail(room.id)">
          <h3 class="room-card__name">{{ room.name }}</h3>

          <!-- 属性标签 -->
          <div class="room-card__attrs" v-if="room.area || room.bed_type">
            <span v-if="room.area" class="room-card__attr">📐 {{ room.area }}㎡</span>
            <span v-if="room.bed_type" class="room-card__attr">🛏 {{ room.bed_type }}</span>
            <span v-if="room.view_type" class="room-card__attr">🏙 {{ room.view_type }}</span>
            <span v-if="room.smoke_free" class="room-card__attr">🚭 禁烟</span>
          </div>

          <!-- 设施 -->
          <div class="room-card__facilities" v-if="room.facilityList && room.facilityList.length">
            <span v-for="(f, i) in room.facilityList.slice(0, 4)" :key="i" class="room-card__fac">✓ {{ f }}</span>
          </div>

          <!-- 底部 -->
          <div class="room-card__footer">
            <div class="room-card__price-area">
              <div class="room-card__price">¥{{ room.price }}<sub>/晚</sub></div>
              <div v-if="room.member_discount" class="room-card__member-badge">💎 会员享{{ room.member_discount }}折</div>
            </div>
            <div class="room-card__actions">
              <button class="room-card__btn room-card__btn--outline" @click.stop="goDetail(room.id)">详情</button>
              <button class="room-card__btn room-card__btn--primary" @click.stop="goBook(room.id)">预订</button>
            </div>
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
const rooms = ref([]);
const loading = ref(true);

const facilityMap = [
  { key: 'tv', name: '智能电视' }, { key: 'ac', name: '空调' },
  { key: 'wifi', name: '免费WiFi' }, { key: 'bathtub', name: '独立浴缸' },
  { key: 'coffee', name: '咖啡机' }, { key: 'toiletries', name: '洗漱用品' },
  { key: 'washer', name: '洗衣机' }, { key: 'parking', name: '免费停车' },
];

onMounted(async () => {
  try {
    const res = await api.getRooms();
    rooms.value = (res.data || []).map(r => ({
      ...r,
      facilityList: facilityMap.filter(f => r[f.key]).map(f => f.name),
    }));
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

function goDetail(id) { router.push(`/room/${id}`); }
function goBook(id) {
  const today = new Date();
  const ci = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const co = new Date(today); co.setDate(co.getDate() + 1);
  const coStr = `${co.getFullYear()}-${String(co.getMonth()+1).padStart(2,'0')}-${String(co.getDate()).padStart(2,'0')}`;
  router.push(`/order/create?roomId=${id}&checkIn=${ci}&checkOut=${coStr}`);
}
</script>

<style scoped>
.rooms__top-bar {
  padding: 16px;
  background: #fff;
}
.rooms__title { font-size: 20px; font-weight: 700; }
.rooms__count { padding: 10px 14px; font-size: 12px; color: #999; }
.rooms__count strong { color: #1a1a1a; }
.rooms__state { text-align: center; color: #999; padding: 60px 0; }

.rooms__list { padding: 0 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.room-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 8px rgba(0, 0, 0, .08);
  border: 1px solid #f0f0f0;
}
.room-card__photo {
  height: 160px;
  position: relative;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.room-card__photo-img { width: 100%; height: 100%; object-fit: cover; }
.room-card__photo--placeholder { font-size: 48px; }
.room-card__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
}
.room-card__badge--hot { background: #ff4d4f; }
.room-card__badge--suite { background: #ff7800; }

.room-card__body { padding: 12px; cursor: pointer; }
.room-card__name { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.room-card__attrs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.room-card__attr {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #666;
  background: #f7f7f7;
  padding: 3px 8px;
  border-radius: 6px;
}
.room-card__facilities { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.room-card__fac { font-size: 11px; color: #1a56db; }

.room-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid #f7f7f7;
  padding-top: 10px;
}
.room-card__price { color: #ff4d4f; font-size: 20px; font-weight: 700; }
.room-card__price sub { font-size: 12px; font-weight: 400; color: #999; }
.room-card__member-badge {
  display: inline-block;
  font-size: 10px;
  color: #e65100;
  background: #fff3e0;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 2px;
}
.room-card__actions { display: flex; gap: 8px; }
.room-card__btn {
  border-radius: 16px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.room-card__btn--outline {
  border: 1px solid #1a56db;
  color: #1a56db;
  background: #fff;
}
.room-card__btn--primary {
  background: #1a56db;
  color: #fff;
  border: none;
}
</style>
