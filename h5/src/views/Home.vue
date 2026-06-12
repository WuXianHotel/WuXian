<template>
  <div class="home">
    <!-- Hero 搜索区 -->
    <div class="hero">
      <h1 class="hero__title">寻找你的专属住所</h1>
      <div class="hero__search" @click="goRooms">
        <svg class="hero__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#999" stroke-width="2"/><line x1="20" y1="20" x2="16.5" y2="16.5" stroke="#999" stroke-width="2" stroke-linecap="round"/></svg>
        <span class="hero__search-text">搜索房型、设施...</span>
      </div>
    </div>

    <!-- 公告 -->
    <div class="notice">
      <span class="notice__icon">📢</span>
      <span>酒店正在试业中，欢迎您的入住！</span>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-entry">
      <div class="quick-entry__item" @click="router.push('/rooms')">
        <div class="quick-entry__icon quick-entry__icon--blue">🛏️</div>
        <span>预订房间</span>
      </div>
      <div class="quick-entry__item" @click="router.push('/orders')">
        <div class="quick-entry__icon quick-entry__icon--green">📋</div>
        <span>我的订单</span>
      </div>
      <div class="quick-entry__item" @click="router.push('/member')">
        <div class="quick-entry__icon quick-entry__icon--orange">💎</div>
        <span>会员中心</span>
      </div>
      <div class="quick-entry__item" @click="router.push('/mall')">
        <div class="quick-entry__icon quick-entry__icon--purple">🎁</div>
        <span>积分商城</span>
      </div>
    </div>

    <!-- 热门房型 -->
    <section class="section">
      <div class="section__header">
        <h3 class="section__title">热门房型</h3>
        <span class="section__more" @click="router.push('/rooms')">查看全部 ›</span>
      </div>

      <div v-if="loading" class="home__loading">加载中...</div>
      <div v-else class="room-list">
        <div
          v-for="room in rooms"
          :key="room.id"
          class="room-card"
          @click="router.push(`/room/${room.id}`)"
        >
          <div class="room-card__img-wrap">
            <img v-if="room.image_url" :src="room.image_url" :alt="room.name" class="room-card__img" />
            <div v-else class="room-card__img room-card__img--placeholder">🛏️</div>
          </div>
          <div class="room-card__body">
            <h4 class="room-card__name">{{ room.name }}</h4>
            <div class="room-card__tags">
              <span v-if="room.area" class="room-card__tag">{{ room.area }}㎡</span>
              <span v-if="room.bed_type" class="room-card__tag">{{ room.bed_type }}</span>
              <span v-for="(f, i) in (room.facilities || []).slice(0, 2)" :key="i" class="room-card__tag">{{ f.name || f }}</span>
            </div>
            <div class="room-card__meta" v-if="room.rating">
              ⭐ {{ room.rating }}分 · 已入住 {{ room.stay_count || 0 }}次
            </div>
            <div class="room-card__footer">
              <div class="room-card__price">¥{{ room.price }}<span class="room-card__price-unit">/晚</span></div>
              <button class="room-card__btn">立即预订</button>
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
    const { default: api } = await import('../utils/api.js');
    const res = await api.getRooms();
    const list = (res.data || []).slice(0, 4);
    // 构造 facilities 便于展示
    const facilityMap = [
      { key: 'tv', name: '智能电视' }, { key: 'ac', name: '空调' },
      { key: 'wifi', name: '免费WiFi' }, { key: 'bathtub', name: '独立浴缸' },
    ];
    rooms.value = list.map(r => ({
      ...r,
      facilities: facilityMap.filter(f => r[f.key]).map(f => f.name),
    }));
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

function goRooms() { router.push('/rooms'); }
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #1a56db, #3b82f6);
  padding: 24px 16px 20px;
}
.hero__title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 14px;
}
.hero__search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 12px;
  padding: 13px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .1);
  cursor: pointer;
}
.hero__search-text {
  font-size: 14px;
  color: #999;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px;
  padding: 10px 12px;
  background: #fffbe6;
  border-left: 3px solid #faad14;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  color: #666;
}

.quick-entry {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 12px 12px;
}
.quick-entry__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: #fff;
  border-radius: 12px;
  cursor: pointer;
  font-size: 11px;
  color: #555;
}
.quick-entry__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.quick-entry__icon--blue { background: #e0f0ff; }
.quick-entry__icon--green { background: #e8f5e9; }
.quick-entry__icon--orange { background: #fff3e0; }
.quick-entry__icon--purple { background: #f3e5f5; }

.section { padding: 0 12px 12px; }
.section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0 12px;
}
.section__title { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.section__more { font-size: 12px; color: #1a56db; cursor: pointer; }

.home__loading { text-align: center; color: #999; padding: 30px 0; }

.room-list { display: flex; flex-direction: column; gap: 10px; }
.room-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .06);
  cursor: pointer;
}
.room-card__img-wrap { width: 110px; flex-shrink: 0; }
.room-card__img {
  width: 100%;
  height: 100%;
  min-height: 100px;
  object-fit: cover;
  background: linear-gradient(135deg, #a8edea, #fed6e3);
}
.room-card__img--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  background: linear-gradient(135deg, #a8edea, #fed6e3);
}
.room-card__body { flex: 1; padding: 12px; display: flex; flex-direction: column; }
.room-card__name { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
.room-card__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.room-card__tag { font-size: 10px; color: #1a56db; background: #e8f0fe; padding: 2px 6px; border-radius: 4px; }
.room-card__meta { font-size: 11px; color: #999; margin-bottom: 8px; }
.room-card__footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.room-card__price { color: #ff4d4f; font-size: 17px; font-weight: 700; }
.room-card__price-unit { font-size: 11px; color: #999; font-weight: 400; }
.room-card__btn {
  background: #1a56db;
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
}
</style>
