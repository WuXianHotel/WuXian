<template>
  <div class="home">
    <!-- Hero -->
    <div class="hero">
      <div class="hero__glow"></div>
      <div class="hero__grid"></div>
      <p class="hero__tag">WELCOME TO WUXIAN HOTEL</p>
      <h1 class="hero__title">寻找你的专属住所</h1>
      <div class="hero__search" @click="$router.push('/rooms')">
        <Search class="hero__search-icon" :size="16" :stroke-width="2" />
        <span>搜索房型、设施...</span>
      </div>
    </div>

    <!-- 公告 -->
    <div class="notice">
      <Megaphone :size="16" :stroke-width="1.5" />
      <span>酒店正在试业中，欢迎您的入住！</span>
    </div>

    <!-- 快捷入口 -->
    <div class="quick">
      <div v-for="item in quickItems" :key="item.path" class="quick__item" @click="$router.push(item.path)">
        <div class="quick__icon" :style="{ background: item.bg }">
          <component :is="item.icon" :size="22" :stroke-width="1.8" />
        </div>
        <span class="quick__label">{{ item.label }}</span>
      </div>
    </div>

    <!-- 热门房型 -->
    <div class="section">
      <div class="section__head">
        <h3 class="section__title">热门房型</h3>
        <span class="section__more" @click="$router.push('/rooms')">查看全部 <ArrowRight :size="14" class="section__more-icon" /></span>
      </div>

      <div v-if="loading" class="home__skeleton">
        <div v-for="i in 3" :key="i" class="skeleton" style="height:100px;margin-bottom:10px;border-radius:14px"></div>
      </div>

      <div v-else class="room-list">
        <div
          v-for="(room, idx) in rooms" :key="room.id"
          class="room-card fade-in-up"
          :style="{ animationDelay: idx * .1 + 's' }"
          @click="$router.push(`/room/${room.id}`)"
        >
          <div class="room-card__img-wrap">
            <img v-if="room.image_url" :src="room.image_url" :alt="room.name" class="room-card__img" />
            <div v-else class="room-card__img room-card__img--ph"><BedSingle :size="36" :stroke-width="1.5" /></div>
          </div>
          <div class="room-card__body">
            <h4 class="room-card__name">{{ room.name }}</h4>
            <div class="room-card__tags">
              <span v-if="room.area">{{ room.area }}㎡</span>
              <span v-if="room.bed_type">{{ room.bed_type }}</span>
              <span v-for="(f, i) in room.facilities.slice(0,2)" :key="i">{{ f }}</span>
            </div>
            <div class="room-card__footer">
              <span class="room-card__price">¥{{ room.price }}<sub>/晚</sub></span>
              <span class="room-card__btn">预订 <ChevronRight :size="14" /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Search, Megaphone, BedSingle, ChevronRight, ArrowRight, Gem, Gift, ClipboardList } from 'lucide-vue-next';

const rooms = ref([]);
const loading = ref(true);
const quickItems = [
  { path: '/rooms', icon: BedSingle, label: '客房预订', bg: 'rgba(0,212,255,.12)' },
  { path: '/orders', icon: ClipboardList, label: '我的订单', bg: 'rgba(0,255,136,.12)' },
  { path: '/member', icon: Gem, label: '会员中心', bg: 'rgba(168,85,247,.12)' },
  { path: '/mall', icon: Gift, label: '积分商城', bg: 'rgba(255,51,102,.12)' },
];

const facilityMap = [
  { key: 'tv', name: '智能电视' }, { key: 'ac', name: '空调' },
  { key: 'wifi', name: '免费WiFi' }, { key: 'bathtub', name: '独立浴缸' },
];

onMounted(async () => {
  try {
    const { default: api } = await import('../utils/api.js');
    const res = await api.getRooms();
    rooms.value = ((res.data?.list || [])).slice(0, 4).map(r => ({
      ...r,
      facilities: facilityMap.filter(f => r[f.key]).map(f => f.name),
    }));
  } catch { /* ignore */ }
  finally { loading.value = false; }
});
</script>

<style scoped>
.hero {
  position: relative; padding: 36px 20px 28px; overflow: hidden;
  background: linear-gradient(160deg, #0a1628 0%, #131e3a 40%, #1a0a2e 100%);
}
.hero__glow { position: absolute; top: -40%; right: -20%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(0,212,255,.12), transparent 70%); pointer-events: none; }
.hero__grid { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,212,255,.03) 1px, transparent 1px), linear-gradient(rgba(0,212,255,.03) 1px, transparent 1px); background-size: 30px 30px; pointer-events: none; }
.hero__tag { font-family: var(--font-display); font-size: 10px; letter-spacing: 3px; color: var(--neon-cyan); margin-bottom: 8px; opacity: .8; }
.hero__title { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 20px; letter-spacing: 1px; }
.hero__search { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: var(--radius-md); padding: 13px 16px; color: var(--text-muted); font-size: 14px; cursor: pointer; transition: border-color var(--dur-normal); }
.hero__search:hover { border-color: var(--border-glow); }
.hero__search-icon { color: var(--text-muted); flex-shrink: 0; }

.notice { display: flex; align-items: center; gap: 10px; margin: 14px; padding: 12px 14px; background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.15); border-radius: var(--radius-md); font-size: 12px; color: var(--neon-gold); }
.notice :deep(svg) { flex-shrink: 0; }

.quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 0 14px; margin-bottom: 8px; }
.quick__item { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; transition: all var(--dur-normal) var(--ease-out); }
.quick__item:hover { border-color: var(--border-glow); transform: translateY(-2px); }
.quick__icon { width: 46px; height: 46px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
.quick__label { font-size: 11px; color: var(--text-secondary); }

.section { padding: 6px 14px 20px; }
.section__head { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
.section__title { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.section__more { font-size: 12px; color: var(--neon-cyan); cursor: pointer; display: flex; align-items: center; gap: 2px; }
.section__more-icon { transition: transform var(--dur-fast); }
.section__more:hover .section__more-icon { transform: translateX(2px); }

.home__skeleton { padding-top: 8px; }

.room-list { display: flex; flex-direction: column; gap: 10px; }
.room-card { display: flex; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; cursor: pointer; transition: all var(--dur-normal) var(--ease-out); }
.room-card:hover { border-color: var(--border-glow); transform: translateX(4px); }
.room-card__img-wrap { width: 110px; flex-shrink: 0; }
.room-card__img { width: 100%; height: 100%; min-height: 100px; object-fit: cover; }
.room-card__img--ph { background: linear-gradient(135deg, rgba(0,212,255,.1), rgba(168,85,247,.1)); display: flex; align-items: center; justify-content: center; color: var(--neon-cyan); }
.room-card__body { flex: 1; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; }
.room-card__name { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.room-card__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.room-card__tags span { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: rgba(0,212,255,.08); color: var(--neon-cyan); }
.room-card__footer { display: flex; justify-content: space-between; align-items: center; }
.room-card__price { font-size: 18px; font-weight: 700; color: var(--neon-cyan); }
.room-card__price sub { font-size: 11px; font-weight: 400; color: var(--text-muted); }
.room-card__btn { font-size: 12px; color: var(--neon-purple); font-weight: 600; display: flex; align-items: center; gap: 1px; transition: color var(--dur-fast); }
.room-card:hover .room-card__btn { color: var(--neon-cyan); }
</style>
