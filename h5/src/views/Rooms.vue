<template>
  <div class="rooms">
    <div class="rooms__top">
      <h1 class="rooms__title">选择房型</h1>
      <p class="rooms__count" v-if="!loading">共 <strong>{{ total }}</strong> 个房型</p>
    </div>

    <!-- 搜索 & 筛选 -->
    <div class="filter-bar">
      <!-- 搜索框 -->
      <div class="filter-bar__search">
        <Search :size="15" :stroke-width="2" class="filter-bar__search-icon" />
        <input
          v-model="filters.keyword"
          @input="debounceSearch"
          placeholder="搜索房型名称..."
          class="filter-bar__input"
        />
        <button v-if="filters.keyword" class="filter-bar__clear" @click="clearSearch">
          <X :size="14" :stroke-width="2" />
        </button>
      </div>

      <!-- 床型筛选 - 横向滚动标签栏 -->
      <div class="filter-bar__chips" ref="chipRow" @touchstart.passive>
        <button
          v-for="item in bedTypeOptions"
          :key="item.value"
          class="chip"
          :class="{ 'chip--active': filters.bedType === item.value }"
          @click="selectBedType(item.value)"
        >
          <BedSingle v-if="item.icon" :size="14" :stroke-width="1.5" class="chip__icon" />
          <span>{{ item.label }}</span>
        </button>
      </div>

      <!-- 排序 & 结果计数 -->
      <div class="filter-bar__footer">
        <div class="sort-tabs">
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            class="sort-tab"
            :class="{ 'sort-tab--active': filters.sortBy === opt.value }"
            @click="selectSort(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <span class="filter-bar__result" v-if="!loading && total > 0">
          {{ total }}个结果
        </span>
      </div>
    </div>

    <div v-if="loading" class="rooms__state">
      <div v-for="i in 3" :key="i" class="skeleton" style="height:200px;margin-bottom:var(--space-sm);border-radius:var(--radius-md)"></div>
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
          <div class="room-card__attrs" v-if="room.area || room.bed_type || room.pcCount">
            <span v-if="room.area"><Ruler :size="12" /> {{ room.area }}㎡</span>
            <span v-if="room.bed_type"><BedSingle :size="12" /> {{ room.bed_type }}</span>
            <span v-if="room.pcCount" class="room-card__pc"><Monitor :size="12" /> {{ room.pcCount }}台电脑</span>
            <span v-for="(cfg, i) in room.pcConfigs" :key="i" class="room-card__pc"><Monitor :size="12" /> {{ cfg }}</span>
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
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { BedSingle, Ruler, Building2, Check, Gem, Search, Monitor, X } from 'lucide-vue-next';
import api from '../utils/api.js';

const router = useRouter();
const rooms = ref([]);
const loading = ref(true);
const total = ref(0);
const filters = reactive({ keyword: '', bedType: '', sortBy: '' });
let searchTimer = 0;

// 床型选项 - 移动端标签栏
const bedTypeOptions = [
  { value: '', label: '全部床型', icon: false },
  { value: '大床', label: '大床', icon: true },
  { value: '双床', label: '双床', icon: true },
  { value: '三床', label: '三床', icon: true },
  { value: '四床', label: '四床', icon: true },
  { value: '单人床', label: '单人床', icon: true },
  { value: '上下铺', label: '上下铺', icon: true },
  { value: '榻榻米', label: '榻榻米', icon: true },
];

// 排序选项
const sortOptions = [
  { value: '', label: '默认' },
  { value: 'price_asc', label: '价格↑' },
  { value: 'price_desc', label: '价格↓' },
];

function selectBedType(value) {
  filters.bedType = value;
  loadRooms();
}

function selectSort(value) {
  filters.sortBy = value;
  loadRooms();
}

function clearSearch() {
  filters.keyword = '';
  loadRooms();
}

const facilityMap = [
  { key: 'tv', name: '智能电视' }, { key: 'ac', name: '空调' },
  { key: 'wifi', name: '免费WiFi' }, { key: 'bathtub', name: '独立浴缸' },
  { key: 'coffee', name: '咖啡机' }, { key: 'toiletries', name: '洗漱用品' },
  { key: 'washer', name: '洗衣机' }, { key: 'parking', name: '免费停车' },
];

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadRooms, 400);
}

async function loadRooms() {
  loading.value = true;
  try {
    const params = {};
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.bedType) params.bedType = filters.bedType;
    if (filters.sortBy) params.sortBy = filters.sortBy;

    const res = await api.getRooms(params);
    rooms.value = (res.data?.list || []).map(r => ({
      ...r,
      facilityList: facilityMap.filter(f => r[f.key]).map(f => f.name),
    }));
    total.value = res.data?.total || 0;
  } catch { /* ignore */ }
  finally { loading.value = false; }
}

onMounted(() => { loadRooms(); });

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
/* ═══ 页面头部 ═══ */
.rooms__top { padding: var(--space-lg) var(--space-md) var(--space-xs); }
.rooms__title { font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: 1px; }
.rooms__count { font-size: 12px; color: var(--text-muted); margin-top: var(--space-xs); }
.rooms__count strong { color: var(--text-secondary); }
.rooms__state { padding: var(--space-md); color: var(--text-muted); font-size: 14px; text-align: center; }

/* ═══ 筛选栏容器 ═══ */
.filter-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  padding: 0 var(--space-md) var(--space-sm);
  background: linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-deep) 85%, transparent 100%);
}

/* ═══ 搜索框 ═══ */
.filter-bar__search {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 42px;
  padding: 0 var(--space-md);
  margin-bottom: var(--space-sm);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  transition: border-color var(--dur-normal);
}
.filter-bar__search:focus-within {
  border-color: var(--border-glow);
  box-shadow: 0 0 0 2px rgba(0, 212, 255, .06);
}
.filter-bar__search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.filter-bar__input {
  flex: 1;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
}
.filter-bar__input::placeholder { color: var(--text-muted); }
.filter-bar__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .08);
  color: var(--text-muted);
  flex-shrink: 0;
  transition: background var(--dur-fast);
}
.filter-bar__clear:hover { background: rgba(255, 255, 255, .15); }

/* ═══ 床型标签栏 (横向滚动) ═══ */
.filter-bar__chips {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
}
.filter-bar__chips::-webkit-scrollbar { display: none; }

/* Chip 标签 */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}
.chip:active {
  transform: scale(.95);
}
.chip--active {
  background: rgba(0, 212, 255, .1);
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
  box-shadow: 0 0 12px rgba(0, 212, 255, .12);
}
.chip__icon {
  opacity: .7;
}
.chip--active .chip__icon {
  opacity: 1;
}

/* ═══ 排序 & 结果 ═══ */
.filter-bar__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sort-tabs {
  display: flex;
  gap: var(--space-xs);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  padding: 3px;
}
.sort-tab {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}
.sort-tab--active {
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 212, 255, .25);
}
.filter-bar__result {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ═══ 房型列表 ═══ */
.rooms__list {
  padding: 0 var(--space-md) calc(var(--space-lg) + 52px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* ═══ 房型卡片 ═══ */
.room-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--dur-normal) var(--ease-out);
}
.room-card:hover { border-color: var(--border-glow); }

.room-card__photo {
  height: 180px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.room-card__photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.room-card__photo--ph {
  background: linear-gradient(135deg, rgba(0,212,255,.05), rgba(168,85,247,.05));
  color: var(--neon-cyan);
}

/* Badge */
.room-card__badge {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  color: #fff;
  font-weight: 600;
  backdrop-filter: blur(8px);
}
.room-card__badge--hot { background: var(--neon-pink); }
.room-card__badge--suite { background: var(--neon-purple); }

.room-card__body { padding: var(--space-md); cursor: pointer; }
.room-card__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

/* 属性标签 */
.room-card__attrs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}
.room-card__attrs span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, .03);
  border: 1px solid var(--border-subtle);
}

/* 设施标签 */
.room-card__facs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}
.room-card__facs span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--neon-cyan);
}

/* Footer */
.room-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid var(--border-subtle);
  padding-top: var(--space-md);
}
.room-card__price {
  font-size: 22px;
  font-weight: 700;
  color: var(--neon-cyan);
}
.room-card__price sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}
.room-card__member {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--neon-gold);
  margin-top: 4px;
}
.room-card__actions { display: flex; gap: var(--space-sm); }

/* 按钮 */
.btn {
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--dur-normal) var(--ease-out);
}
.btn--outline {
  border: 1px solid var(--text-muted);
  color: var(--text-secondary);
  background: transparent;
}
.btn--outline:hover { border-color: var(--neon-cyan); color: var(--neon-cyan); }
.btn--neon {
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff;
}
.btn--neon:hover { transform: translateY(-1px); box-shadow: var(--shadow-glow-cyan); }
</style>
