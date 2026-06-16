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

      <!-- 床型 & 排序 - 同一行 -->
      <div class="filter-bar__row">
        <!-- 床型下拉 -->
        <div class="dropdown" :class="{ 'dropdown--open': dropdownOpen }">
          <button class="dropdown__trigger" @click="toggleDropdown">
            <BedSingle :size="14" :stroke-width="1.5" class="dropdown__icon" />
            <span class="dropdown__label">{{ selectedBedTypeLabel }}</span>
            <ChevronDown :size="14" :stroke-width="2" class="dropdown__arrow" :class="{ 'dropdown__arrow--up': dropdownOpen }" />
          </button>

          <!-- 下拉面板 -->
          <Teleport to="body">
            <Transition name="sheet-overlay">
              <div v-if="dropdownOpen" class="dropdown__overlay" @click="closeDropdown"></div>
            </Transition>
            <Transition name="sheet-panel">
              <div v-if="dropdownOpen" class="dropdown__panel">
                <div class="dropdown__head">
                  <span class="dropdown__title">选择床型</span>
                  <button class="dropdown__close" @click="closeDropdown">
                    <X :size="18" :stroke-width="2" />
                  </button>
                </div>
                <div class="dropdown__list">
                  <button
                    v-for="item in bedTypeOptions"
                    :key="item.value"
                    class="dropdown__option"
                    :class="{ 'dropdown__option--active': filters.bedType === item.value }"
                    @click="selectBedType(item.value)"
                  >
                    <BedSingle v-if="item.icon" :size="16" :stroke-width="1.5" />
                    <span>{{ item.label }}</span>
                    <Check v-if="filters.bedType === item.value" :size="16" :stroke-width="2" class="dropdown__check" />
                  </button>
                </div>
              </div>
            </Transition>
          </Teleport>
        </div>

        <!-- 排序 -->
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
import { ref, onMounted, reactive, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { BedSingle, Ruler, Building2, Check, Gem, Search, Monitor, X, ChevronDown } from 'lucide-vue-next';
import api from '../utils/api.js';

const router = useRouter();
const rooms = ref([]);
const loading = ref(true);
const total = ref(0);
const filters = reactive({ keyword: '', bedType: '', sortBy: '' });
let searchTimer = 0;

// 下拉状态
const dropdownOpen = ref(false);

// 从接口获取的床型列表
const bedTypeOptions = ref([{ value: '', label: '全部床型', icon: true }]);

const selectedBedTypeLabel = computed(() => {
  const opt = bedTypeOptions.value.find(o => o.value === filters.bedType);
  return opt?.label || '全部床型';
});

// 排序选项
const sortOptions = [
  { value: '', label: '默认' },
  { value: 'price_asc', label: '价格↑' },
  { value: 'price_desc', label: '价格↓' },
];

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
}

function closeDropdown() {
  dropdownOpen.value = false;
}

function selectBedType(value) {
  filters.bedType = value;
  closeDropdown();
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

// 从接口获取所有已有床型
async function fetchBedTypes() {
  try {
    const res = await api.getRooms({});
    const list = res.data?.list || [];
    const types = [...new Set(list.map(r => r.bed_type).filter(Boolean))];
    // 按常见床型顺序排列
    const order = ['大床', '双床', '单人床', '三床', '四床', '上下铺', '榻榻米'];
    types.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    bedTypeOptions.value = [
      { value: '', label: '全部床型', icon: true },
      ...types.map(t => ({ value: t, label: t, icon: true })),
    ];
  } catch { /* 使用默认值 */ }
}

// ESC 关闭下拉
function onKeydown(e) {
  if (e.key === 'Escape') closeDropdown();
}

onMounted(() => {
  fetchBedTypes();
  loadRooms();
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
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
.filter-bar__search-icon { color: var(--text-muted); flex-shrink: 0; }
.filter-bar__input {
  flex: 1;
  height: 100%;
  border: 0; outline: 0;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
}
.filter-bar__input::placeholder { color: var(--text-muted); }
.filter-bar__clear {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .08);
  color: var(--text-muted);
  flex-shrink: 0;
  transition: background var(--dur-fast);
}
.filter-bar__clear:hover { background: rgba(255, 255, 255, .15); }

/* ═══ 床型 & 排序 - 同行布局 ═══ */
.filter-bar__row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* ═══ 床型下拉 ═══ */
.dropdown {
  flex: 1;
  min-width: 0;
  position: relative;
}
.dropdown__trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}
.dropdown--open .dropdown__trigger {
  border-color: var(--border-glow);
  box-shadow: 0 0 0 2px rgba(0, 212, 255, .08);
}
.dropdown__icon {
  color: var(--neon-cyan);
  flex-shrink: 0;
}
.dropdown__label {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dropdown__arrow {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform var(--dur-fast) var(--ease-out);
}
.dropdown__arrow--up {
  transform: rotate(180deg);
}

/* 下拉面板遮罩 */
.dropdown__overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, .4);
  -webkit-tap-highlight-color: transparent;
}

/* 下拉面板 */
.dropdown__panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 201;
  max-height: 55vh;
  background: var(--bg-primary);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border-top: 1px solid var(--border-subtle);
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.dropdown__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.dropdown__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.dropdown__close {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: all var(--dur-fast);
}
.dropdown__close:hover { background: rgba(255, 255, 255, .06); color: var(--text-primary); }

.dropdown__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dropdown__option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 13px var(--space-md);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--dur-fast);
  -webkit-tap-highlight-color: transparent;
}
.dropdown__option:hover { background: rgba(255, 255, 255, .04); }
.dropdown__option--active {
  background: rgba(0, 212, 255, .06);
  color: var(--neon-cyan);
}
.dropdown__check {
  margin-left: auto;
  color: var(--neon-cyan);
  flex-shrink: 0;
}

/* ═══ 排序标签 ═══ */
.sort-tabs {
  display: flex;
  gap: var(--space-xs);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  padding: 3px;
  flex-shrink: 0;
}
.sort-tab {
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}
.sort-tab--active {
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 212, 255, .25);
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

/* ═══ 下拉面板过渡动画 ═══ */
.sheet-overlay-enter-active,
.sheet-overlay-leave-active {
  transition: opacity .25s cubic-bezier(.16, 1, .3, 1);
}
.sheet-overlay-enter-from,
.sheet-overlay-leave-to {
  opacity: 0;
}

.sheet-panel-enter-active,
.sheet-panel-leave-active {
  transition: transform .25s cubic-bezier(.16, 1, .3, 1);
}
.sheet-panel-enter-from,
.sheet-panel-leave-to {
  transform: translateY(100%);
}
</style>
