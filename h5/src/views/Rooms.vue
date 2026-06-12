<template>
  <div class="rooms">
    <div class="rooms__top">
      <h1 class="rooms__title">选择房型</h1>
      <p class="rooms__count" v-if="!loading">共 <strong>{{ rooms.length }}</strong> 个房型</p>
    </div>

    <div v-if="loading" class="rooms__state">
      <div v-for="i in 3" :key="i" class="skeleton" style="height:200px;margin-bottom:10px;border-radius:14px"></div>
    </div>
    <div v-else-if="!rooms.length" class="rooms__state">暂无可用房型</div>

    <div v-else class="rooms__list">
      <div
        v-for="(room, idx) in rooms" :key="room.id"
        class="room-card fade-in-up"
        :style="{ animationDelay: idx * .08 + 's' }"
      >
        <div class="room-card__photo" @click="goDetail(room.id)">
          <img v-if="room.imageUrl" :src="room.imageUrl" :alt="room.name" class="room-card__photo-img" />
          <div v-else class="room-card__photo room-card__photo--ph"><BedSingle :size="48" :stroke-width="1.5" /></div>
          <span v-if="room.is_hot" class="room-card__badge room-card__badge--hot">热销</span>
          <span v-else-if="room.room_type=='suite'" class="room-card__badge room-card__badge--suite">套房</span>
        </div>

        <div class="room-card__body" @click="goDetail(room.id)">
          <h3 class="room-card__name">{{ room.name }}</h3>
          <div class="room-card__attrs" v-if="room.area || room.bed_type">
            <span v-if="room.area"><Ruler :size="12" /> {{ room.area }}㎡</span>
            <span v-if="room.bed_type"><BedSingle :size="12" /> {{ room.bed_type }}</span>
            <span v-if="room.view_type"><Building2 :size="12" /> {{ room.view_type }}</span>
          </div>
          <div class="room-card__facs" v-if="room.facilityList?.length">
            <span v-for="(f,i) in room.facilityList.slice(0,4)" :key="i"><Check :size="12" /> {{ f }}</span>
          </div>
          <div class="room-card__footer">
            <div class="room-card__price-area">
              <div class="room-card__price">¥{{ room.price }}<sub>/晚</sub></div>
              <div v-if="room.member_discount" class="room-card__member"><Gem :size="11" /> 会员{{ room.member_discount }}折</div>
            </div>
            <div class="room-card__actions">
              <button class="btn btn--outline" @click.stop="goDetail(room.id)">详情</button>
              <button class="btn btn--neon" @click.stop="goBook(room.id)">预订</button>
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
import { BedSingle, Ruler, Building2, Check, Gem } from 'lucide-vue-next';
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
    rooms.value = (res.data?.list || []).map(r => ({
      ...r,
      facilityList: facilityMap.filter(f => r[f.key]).map(f => f.name),
    }));
  } catch { /* ignore */ }
  finally { loading.value = false; }
});

function goDetail(id) { router.push(`/room/${id}`); }
function goBook(id) {
  const t = new Date();
  const ci = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  const co = new Date(t); co.setDate(co.getDate()+1);
  const coS = `${co.getFullYear()}-${String(co.getMonth()+1).padStart(2,'0')}-${String(co.getDate()).padStart(2,'0')}`;
  router.push(`/order/create?roomId=${id}&checkIn=${ci}&checkOut=${coS}`);
}
</script>

<style scoped>
.rooms__top { padding: 20px 16px 4px; }
.rooms__title { font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: 1px; }
.rooms__count { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.rooms__count strong { color: var(--text-secondary); }
.rooms__state { padding: 16px; }

.rooms__list { padding: 0 14px 20px; display: flex; flex-direction: column; gap: 12px; }
.room-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; transition: all var(--dur-normal) var(--ease-out); }
.room-card:hover { border-color: var(--border-glow); }
.room-card__photo { height: 180px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.room-card__photo-img { width: 100%; height: 100%; object-fit: cover; }
.room-card__photo--ph { background: linear-gradient(135deg, rgba(0,212,255,.05), rgba(168,85,247,.05)); color: var(--neon-cyan); }
.room-card__badge { position: absolute; top: 12px; right: 12px; font-size: 11px; padding: 3px 10px; border-radius: var(--radius-full); color: #fff; font-weight: 600; }
.room-card__badge--hot { background: var(--neon-pink); }
.room-card__badge--suite { background: var(--neon-purple); }
.room-card__body { padding: 14px 16px; cursor: pointer; }
.room-card__name { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.room-card__attrs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.room-card__attrs span { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-secondary); padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,.03); border: 1px solid var(--border-subtle); }
.room-card__facs { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.room-card__facs span { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--neon-cyan); }
.room-card__footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid var(--border-subtle); padding-top: 14px; }
.room-card__price { font-size: 22px; font-weight: 700; color: var(--neon-cyan); }
.room-card__price sub { font-size: 12px; font-weight: 400; color: var(--text-muted); }
.room-card__member { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; color: var(--neon-gold); margin-top: 4px; }
.room-card__actions { display: flex; gap: 8px; }
.btn { padding: 8px 16px; border-radius: var(--radius-full); font-size: 13px; font-weight: 600; cursor: pointer; transition: all var(--dur-normal) var(--ease-out); }
.btn--outline { border: 1px solid var(--text-muted); color: var(--text-secondary); background: transparent; }
.btn--outline:hover { border-color: var(--neon-cyan); color: var(--neon-cyan); }
.btn--neon { background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)); color: #fff; }
.btn--neon:hover { transform: translateY(-1px); box-shadow: var(--shadow-glow-cyan); }
</style>
