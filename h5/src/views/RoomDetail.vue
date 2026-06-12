<template>
  <div class="rd">
    <NavBar title="房型详情" />

    <!-- Hero 图 -->
    <div class="rd__hero">
      <img v-if="room.image_url" :src="room.image_url" :alt="room.name" class="rd__hero-img" />
      <div v-else class="rd__hero-img rd__hero-img--placeholder">🛏️</div>
    </div>

    <!-- 基本信息 -->
    <div class="rd__section">
      <h1 class="rd__name">{{ room.name || '加载中...' }}</h1>
      <div class="rd__rating">
        <span class="rd__stars">⭐⭐⭐⭐⭐</span>
        <strong>{{ room.rating || '4.9' }}</strong>
        <span class="rd__review-count">{{ room.review_count || 0 }}条评价</span>
      </div>
      <div class="rd__attrs">
        <div v-if="room.area" class="rd__attr"><span class="rd__attr-icon">📐</span><span class="rd__attr-text">{{ room.area }}㎡</span></div>
        <div v-if="room.bed_type" class="rd__attr"><span class="rd__attr-icon">🛏</span><span class="rd__attr-text">{{ room.bed_type }}</span></div>
        <div v-if="room.max_guests" class="rd__attr"><span class="rd__attr-icon">👥</span><span class="rd__attr-text">最多{{ room.max_guests }}人</span></div>
        <div v-if="room.view_type" class="rd__attr"><span class="rd__attr-icon">🏙</span><span class="rd__attr-text">{{ room.view_type }}</span></div>
        <div v-if="room.smoke_free" class="rd__attr"><span class="rd__attr-icon">🚭</span><span class="rd__attr-text">禁烟</span></div>
      </div>
    </div>

    <!-- 房价日历 -->
    <div class="rd__section">
      <div class="rd__section-title">
        房价日历
        <span class="rd__section-more" @click="showCalendar = true">选择日期 ›</span>
      </div>

      <!-- 日期摘要 -->
      <div class="rd__date-pick" @click="showCalendar = true">
        <div class="rd__date-block">
          <span class="rd__date-label">入住</span>
          <span class="rd__date-value">{{ checkInLabel || '选择日期' }}</span>
        </div>
        <span class="rd__date-arrow">→</span>
        <div class="rd__date-block">
          <span class="rd__date-label">退房</span>
          <span class="rd__date-value">{{ checkOutLabel || '选择日期' }}</span>
        </div>
        <span class="rd__nights">共{{ nights }}晚</span>
      </div>

      <!-- 日历内嵌预览 -->
      <div class="rd__calendar-mini">
        <div class="rd__cal-week">
          <span v-for="d in weekDays" :key="d">{{ d }}</span>
        </div>
        <div class="rd__cal-grid">
          <div
            v-for="(day, i) in calendarDays"
            :key="i"
            class="rd__cal-cell"
            :class="[`rd__cal-cell--${day.type || 'normal'}`]"
            @click="selectCalDate(day)"
          >
            <span class="rd__cal-day">{{ day.day }}</span>
            <span v-if="day.price" class="rd__cal-price">¥{{ day.price }}</span>
          </div>
        </div>
        <div class="rd__cal-legend">
          <span><i class="rd__dot rd__dot--holiday"></i>节假日</span>
          <span><i class="rd__dot rd__dot--selected"></i>已选</span>
          <span><i class="rd__dot rd__dot--past"></i>不可选</span>
        </div>
      </div>
    </div>

    <!-- 房间设施 -->
    <div class="rd__section">
      <div class="rd__section-title">房间设施</div>
      <div class="rd__facilities">
        <div v-for="(fac, i) in facilities" :key="i" class="rd__fac-item">
          <span class="rd__fac-icon">{{ fac.emoji }}</span>
          <span class="rd__fac-name">{{ fac.name }}</span>
        </div>
      </div>
    </div>

    <!-- 评价 -->
    <div class="rd__section">
      <div class="rd__section-title">用户评价 <span class="rd__section-more">全部{{ room.review_count || 0 }}条 ›</span></div>

      <div class="rd__review-summary">
        <div class="rd__score">{{ room.rating || '4.9' }}</div>
        <div class="rd__score-bars">
          <div v-for="item in ratingDist" :key="item.star" class="rd__score-bar">
            <span>{{ item.star }}★</span>
            <div class="rd__bar-bg"><div class="rd__bar-fill" :style="{ width: item.pct + '%' }"></div></div>
          </div>
        </div>
      </div>

      <div v-for="r in reviews" :key="r.id" class="rd__review-card">
        <div class="rd__reviewer">
          <div class="rd__avatar">{{ r.avatarEmoji || '😊' }}</div>
          <div>
            <div class="rd__reviewer-name">{{ r.nickname }}</div>
            <div class="rd__reviewer-date">{{ r.date }} · 入住{{ r.nights }}晚</div>
          </div>
        </div>
        <div class="rd__review-stars">⭐⭐⭐⭐⭐</div>
        <p class="rd__review-text">{{ r.content }}</p>
      </div>
    </div>

    <!-- 底部预订栏 -->
    <div class="rd__bar">
      <div class="rd__bar-price">
        <span class="rd__bar-label">每晚起</span>
        <span class="rd__bar-amount">¥{{ room.price || 0 }}<sub>/晚</sub></span>
      </div>
      <button class="rd__bar-btn" @click="goBook">立即预订</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';

const route = useRoute();
const router = useRouter();

const room = ref({});
const nights = ref(1);
const checkIn = ref('');
const checkOut = ref('');
const checkInLabel = ref('');
const checkOutLabel = ref('');
const showCalendar = ref(false);
const calendarDays = ref([]);
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const reviews = ref([]);
const ratingDist = [
  { star: 5, pct: 85 }, { star: 4, pct: 12 }, { star: 3, pct: 3 }, { star: 2, pct: 0 },
];

// 设施列表
const facilities = ref([]);
const facilityMeta = [
  { key: 'tv', name: '智能电视', emoji: '📺' },
  { key: 'ac', name: '空调', emoji: '🌬' },
  { key: 'wifi', name: '免费WiFi', emoji: '📶' },
  { key: 'bathtub', name: '独立浴缸', emoji: '🛁' },
  { key: 'coffee', name: '咖啡机', emoji: '☕' },
  { key: 'toiletries', name: '洗漱用品', emoji: '🧴' },
  { key: 'washer', name: '洗衣机', emoji: '🧺' },
  { key: 'parking', name: '免费停车', emoji: '🚗' },
];

// 工具函数
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(ds, n) { const d = new Date(ds); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function calcNights(a, b) { return Math.round((new Date(b)-new Date(a))/86400000); }
function fmtDate(ds) {
  const d = new Date(ds);
  const wm = ['周日','周一','周二','周三','周四','周五','周六'];
  return `${d.getMonth()+1}月${d.getDate()}日 ${wm[d.getDay()]}`;
}

onMounted(async () => {
  const id = route.params.id;
  const ci = todayStr();
  const co = addDays(ci, 1);
  checkIn.value = ci; checkOut.value = co;
  checkInLabel.value = fmtDate(ci); checkOutLabel.value = fmtDate(co);
  nights.value = 1;

  try {
    const { default: api } = await import('../utils/api.js');
    const res = await api.getRoomDetail(id);
    const r = res.data || {};
    room.value = r;
    facilities.value = facilityMeta.filter(f => r[f.key]);
    buildCalendar();
  } catch { /* ignore */ }

  reviews.value = [
    { id: 1, avatarEmoji: '😊', nickname: '王**', date: '2026-04-20', nights: 1, content: '房间超大，设施非常齐全，浴缸是我见过最舒适的！前台服务态度很好。' },
    { id: 2, avatarEmoji: '😄', nickname: '李**', date: '2026-04-15', nights: 2, content: '城市景观很棒，早上起来看日出太美了。早餐品种丰富，性价比高，强烈推荐！' },
  ];
});

function buildCalendar() {
  const today = new Date(); today.setHours(0,0,0,0);
  const year = today.getFullYear(), month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const days = [];
  for (let i=0; i<firstDay; i++) days.push({ date:'', day:'', type:'empty' });
  for (let d=1; d<=daysInMonth; d++) {
    const date = new Date(year, month, d); date.setHours(0,0,0,0);
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let type = 'normal';
    if (date < today) type = 'past';
    else if (ds === checkIn.value || ds === checkOut.value) type = 'selected';
    else if (ds > checkIn.value && ds < checkOut.value) type = 'in-range';
    else if (date.getTime() === today.getTime()) type = 'today';
    days.push({ date: ds, day: d, type, price: date >= today ? room.value.price : null });
  }
  calendarDays.value = days;
}

function selectCalDate(day) {
  if (!day.date || day.type === 'past') return;
  if (!checkIn.value || (checkIn.value && checkOut.value)) {
    checkIn.value = day.date; checkOut.value = '';
    checkInLabel.value = fmtDate(day.date); checkOutLabel.value = '';
  } else {
    if (day.date <= checkIn.value) {
      checkIn.value = day.date; checkInLabel.value = fmtDate(day.date);
    } else {
      checkOut.value = day.date; checkOutLabel.value = fmtDate(day.date);
      nights.value = calcNights(checkIn.value, day.date);
    }
  }
  buildCalendar();
}

function goBook() {
  if (!checkIn.value || !checkOut.value) { alert('请先选择日期'); return; }
  router.push(`/order/create?roomId=${route.params.id}&checkIn=${checkIn.value}&checkOut=${checkOut.value}`);
}
</script>

<style scoped>
.rd__hero { height: 240px; overflow: hidden; }
.rd__hero-img { width: 100%; height: 100%; object-fit: cover; background: linear-gradient(135deg, #667eea, #764ba2); }
.rd__hero-img--placeholder { display: flex; align-items: center; justify-content: center; font-size: 72px; color: #fff; }

.rd__section { background: #fff; padding: 16px; margin-top: 8px; }
.rd__name { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.rd__rating { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.rd__stars { font-size: 13px; color: #faad14; }
.rd__rating strong { font-size: 13px; color: #1a1a1a; }
.rd__review-count { font-size: 12px; color: #999; }

.rd__attrs { display: flex; gap: 8px; flex-wrap: wrap; }
.rd__attr { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 14px; background: #f7f9ff; border-radius: 8px; }
.rd__attr-icon { font-size: 18px; }
.rd__attr-text { font-size: 11px; color: #666; }

.rd__section-title { font-size: 15px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; display: flex; justify-content: space-between; }
.rd__section-more { font-size: 12px; color: #1a56db; font-weight: 400; cursor: pointer; }

/* 日期选择 */
.rd__date-pick { display: flex; align-items: center; gap: 12px; background: #f7f9ff; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; cursor: pointer; }
.rd__date-block { flex: 1; }
.rd__date-label { display: block; font-size: 11px; color: #999; margin-bottom: 4px; }
.rd__date-value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.rd__date-arrow { color: #1a56db; font-size: 18px; }
.rd__nights { padding: 4px 12px; border-radius: 12px; background: #e8f0fe; color: #1a56db; font-size: 12px; font-weight: 600; white-space: nowrap; }

/* 日历 */
.rd__calendar-mini { margin-bottom: 8px; }
.rd__cal-week { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: #999; margin-bottom: 4px; }
.rd__cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.rd__cal-cell { text-align: center; padding: 6px 2px; font-size: 12px; border-radius: 6px; cursor: pointer; min-height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rd__cal-cell--empty { cursor: default; }
.rd__cal-cell--past { color: #ccc; cursor: default; }
.rd__cal-cell--today { background: #1a56db; color: #fff; border-radius: 6px; }
.rd__cal-cell--selected { background: #e8f0fe; color: #1a56db; }
.rd__cal-cell--in-range { background: #f0f4ff; }
.rd__cal-day { font-weight: 500; }
.rd__cal-price { font-size: 9px; margin-top: 1px; }
.rd__cal-cell--past .rd__cal-price { color: #ccc; }
.rd__cal-cell--today .rd__cal-price { color: #fff; }
.rd__cal-legend { display: flex; gap: 14px; margin-top: 10px; font-size: 11px; color: #999; align-items: center; }
.rd__dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
.rd__dot--holiday { background: #ff4d4f; }
.rd__dot--selected { background: #1a56db; }
.rd__dot--past { background: #ccc; }

/* 设施 */
.rd__facilities { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.rd__fac-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.rd__fac-icon { font-size: 24px; }
.rd__fac-name { font-size: 11px; color: #555; text-align: center; }

/* 评价 */
.rd__review-summary { display: flex; gap: 16px; align-items: center; margin-bottom: 14px; }
.rd__score { font-size: 40px; font-weight: 700; color: #1a56db; line-height: 1; }
.rd__score-bars { flex: 1; }
.rd__score-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; font-size: 11px; color: #999; }
.rd__bar-bg { flex: 1; height: 4px; background: #f0f0f0; border-radius: 2px; }
.rd__bar-fill { height: 4px; background: #faad14; border-radius: 2px; }
.rd__review-card { background: #f7f7f7; border-radius: 10px; padding: 12px; margin-bottom: 8px; }
.rd__reviewer { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.rd__avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #a8edea, #fed6e3); display: flex; align-items: center; justify-content: center; font-size: 16px; }
.rd__reviewer-name { font-size: 13px; font-weight: 600; }
.rd__reviewer-date { font-size: 11px; color: #999; }
.rd__review-stars { font-size: 12px; color: #faad14; margin-bottom: 6px; }
.rd__review-text { font-size: 12px; color: #555; line-height: 1.6; }

/* 底部预订栏 */
.rd__bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fff; border-top: 1px solid #f0f0f0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  display: flex; align-items: center; justify-content: space-between;
  z-index: 20;
}
.rd__bar-label { display: block; font-size: 11px; color: #999; }
.rd__bar-amount { font-size: 22px; font-weight: 700; color: #ff4d4f; }
.rd__bar-amount sub { font-size: 12px; font-weight: 400; }
.rd__bar-btn { background: #1a56db; color: #fff; border: none; border-radius: 24px; padding: 12px 32px; font-size: 15px; font-weight: 600; }
</style>
