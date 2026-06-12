<template>
  <div class="room-detail">
    <!-- 顶部图片滚动 -->
    <div class="rd__carousel">
      <img v-if="room.image_url" :src="room.image_url" :alt="room.name" class="rd__hero" />
      <div v-else class="rd__hero rd__hero--placeholder">暂无图片</div>
    </div>

    <!-- 基本信息 -->
    <div class="rd__section">
      <h1 class="rd__name">{{ room.name || '加载中...' }}</h1>
      <p class="rd__desc">{{ room.description || '' }}</p>
      <div class="rd__tags">
        <span v-for="(f, i) in room.facilities" :key="i" class="rd__tag">{{ f.name || f }}</span>
      </div>
      <div class="rd__price-row">
        <span class="rd__price">¥{{ room.price }}/晚</span>
        <span class="rd__area" v-if="room.area">{{ room.area }}㎡</span>
        <span class="rd__beds" v-if="room.bed_type">{{ room.bed_type }}</span>
      </div>
    </div>

    <!-- 日期选择 -->
    <div class="rd__section">
      <h3 class="rd__section-title">选择入住日期</h3>
      <div class="rd__dates">
        <div class="rd__date-picker" @click="startPicking('checkIn')">
          <span class="rd__date-label">入住</span>
          <span class="rd__date-value" :class="{ 'rd__date-value--placeholder': !checkIn }">{{ checkInLabel || '请选择' }}</span>
        </div>
        <span class="rd__date-arrow">→</span>
        <div class="rd__date-picker" @click="startPicking('checkOut')">
          <span class="rd__date-label">离店</span>
          <span class="rd__date-value" :class="{ 'rd__date-value--placeholder': !checkOut }">{{ checkOutLabel || '请选择' }}</span>
        </div>
      </div>
      <p v-if="nights > 0" class="rd__nights">共 {{ nights }} 晚 · ¥{{ (room.price || 0) * nights }} 起</p>
    </div>

    <!-- 评价 -->
    <div class="rd__section">
      <h3 class="rd__section-title">住客评价</h3>
      <div v-if="!reviews.length" class="rd__empty">暂无评价</div>
      <div v-for="r in reviews" :key="r.id" class="rd__review">
        <div class="rd__review-header">
          <span class="rd__review-user">{{ r.nickname }}</span>
          <span class="rd__review-date">{{ r.date }}</span>
        </div>
        <p class="rd__review-content">{{ r.content }}</p>
      </div>
    </div>

    <!-- 底部预订按钮 -->
    <div class="rd__footer">
      <div class="rd__footer-inner">
        <div class="rd__footer-price">
          <span class="rd__footer-label">预估总价</span>
          <span class="rd__footer-amount">¥{{ estimatedTotal }}</span>
        </div>
        <button class="rd__book-btn" @click="goBook">立即预订</button>
      </div>
    </div>

    <!-- 日历弹窗 -->
    <div v-if="showCalendar" class="rd__overlay" @click.self="showCalendar = false">
      <div class="rd__calendar">
        <h4 class="rd__calendar-title">选择{{ pickingStep === 'checkIn' ? '入住' : '离店' }}日期</h4>
        <div class="rd__calendar-week">
          <span v-for="d in weekDays" :key="d" class="rd__calendar-weekday">{{ d }}</span>
        </div>
        <div class="rd__calendar-grid">
          <div
            v-for="(day, i) in calendarDays"
            :key="i"
            class="rd__cal-day"
            :class="[`rd__cal-day--${day.type || 'normal'}`]"
            :data-date="day.date"
            @click="selectDate(day)"
          >
            <span class="rd__cal-num">{{ day.day }}</span>
            <span v-if="day.price" class="rd__cal-price">¥{{ day.price }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../utils/api.js';

const route = useRoute();
const router = useRouter();

const room = ref({});
const checkIn = ref('');
const checkOut = ref('');
const checkInLabel = ref('');
const checkOutLabel = ref('');
const nights = ref(1);
const showCalendar = ref(false);
const pickingStep = ref('checkIn');
const calendarDays = ref([]);
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const reviews = ref([]);

const estimatedTotal = computed(() => {
  const price = room.value.price || 0;
  return price * nights.value;
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcNights(from, to) {
  return Math.round((new Date(to) - new Date(from)) / 86400000);
}

function formatDateWithDay(dateStr) {
  const d = new Date(dateStr);
  const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekMap[d.getDay()]}`;
}

onMounted(async () => {
  const id = route.params.id;
  const ci = todayStr();
  const co = addDays(ci, 1);
  checkIn.value = ci;
  checkOut.value = co;
  checkInLabel.value = formatDateWithDay(ci);
  checkOutLabel.value = formatDateWithDay(co);
  nights.value = 1;

  try {
    const res = await api.getRoomDetail(id);
    const r = res.data || {};
    // 构造设施列表
    const facilityMap = [
      { key: 'tv', name: '智能电视' },
      { key: 'ac', name: '空调' },
      { key: 'wifi', name: '免费WiFi' },
      { key: 'bathtub', name: '独立浴缸' },
      { key: 'coffee', name: '咖啡机' },
      { key: 'toiletries', name: '洗漱用品' },
      { key: 'washer', name: '洗衣机' },
      { key: 'parking', name: '免费停车' },
    ];
    r.facilities = facilityMap.filter(f => r[f.key]);
    if (!r.facilities.length) {
      r.facilities = facilityMap.slice(0, 6);
    }
    room.value = r;
    buildCalendar();
  } catch {
    // ignore
  }

  // 模拟评价数据
  reviews.value = [
    { id: 1, nickname: '王**', date: '2026-04-15', nights: 2, content: '房间很大，设施齐全，服务很好，下次还会来！' },
    { id: 2, nickname: '李**', date: '2026-04-10', nights: 1, content: '位置绝佳，风景很好，早餐很丰盛，强烈推荐。' },
  ];
});

function buildCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push({ date: '', day: '', type: 'empty' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let type = 'normal';
    if (date < today) type = 'past';
    else if (dateStr === checkIn.value) type = 'selected';
    else if (dateStr === checkOut.value) type = 'selected';
    else if (checkIn.value && checkOut.value && dateStr > checkIn.value && dateStr < checkOut.value) type = 'in-range';
    else if (date.getTime() === today.getTime()) type = 'today';

    days.push({ date: dateStr, day: d, type, price: date >= today ? room.value.price : null });
  }
  calendarDays.value = days;
}

function startPicking(step) {
  pickingStep.value = step;
  showCalendar.value = true;
  buildCalendar();
}

function selectDate(day) {
  if (!day.date || day.type === 'past') return;

  if (pickingStep.value === 'checkIn') {
    checkIn.value = day.date;
    checkOut.value = '';
    checkInLabel.value = formatDateWithDay(day.date);
    checkOutLabel.value = '';
    pickingStep.value = 'checkOut';
  } else {
    if (day.date <= checkIn.value) {
      checkIn.value = day.date;
      checkOut.value = '';
      checkInLabel.value = formatDateWithDay(day.date);
      checkOutLabel.value = '';
      pickingStep.value = 'checkOut';
    } else {
      checkOut.value = day.date;
      checkOutLabel.value = formatDateWithDay(day.date);
      nights.value = calcNights(checkIn.value, day.date);
      pickingStep.value = 'checkIn';
      showCalendar.value = false;
    }
  }
  buildCalendar();
}

function goBook() {
  if (!checkIn.value || !checkOut.value) {
    alert('请先选择入住日期');
    return;
  }
  router.push(`/order/create?roomId=${route.params.id}&checkIn=${checkIn.value}&checkOut=${checkOut.value}`);
}
</script>

<style scoped>
.rd__carousel { width: 100%; height: 260px; overflow: hidden; }
.rd__hero { width: 100%; height: 100%; object-fit: cover; }
.rd__hero--placeholder { display: flex; align-items: center; justify-content: center; background: #e5e7eb; color: #999; font-size: 16px; }
.rd__section { margin: 12px; padding: 16px; background: #fff; border-radius: 12px; }
.rd__name { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
.rd__desc { font-size: 14px; color: #666; margin-bottom: 12px; line-height: 1.6; }
.rd__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.rd__tag { font-size: 12px; padding: 3px 10px; border-radius: 4px; background: #f0f4ff; color: #1a56db; }
.rd__price-row { display: flex; align-items: center; gap: 10px; }
.rd__price { font-size: 22px; font-weight: 700; color: #e02424; }
.rd__area, .rd__beds { font-size: 13px; color: #999; }
.rd__section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.rd__dates { display: flex; align-items: center; gap: 12px; }
.rd__date-picker { flex: 1; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; cursor: pointer; }
.rd__date-label { display: block; font-size: 11px; color: #999; margin-bottom: 4px; }
.rd__date-value { font-size: 14px; font-weight: 500; }
.rd__date-value--placeholder { color: #ccc; }
.rd__date-arrow { color: #ccc; }
.rd__nights { font-size: 14px; color: #666; margin-top: 10px; text-align: right; }
.rd__empty { color: #999; font-size: 13px; }
.rd__review { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.rd__review:last-child { border-bottom: 0; }
.rd__review-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.rd__review-user { font-size: 14px; font-weight: 500; }
.rd__review-date { font-size: 12px; color: #ccc; }
.rd__review-content { font-size: 14px; color: #666; line-height: 1.5; }

.rd__footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #eee; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); z-index: 10; }
.rd__footer-inner { display: flex; align-items: center; justify-content: space-between; }
.rd__footer-label { display: block; font-size: 11px; color: #999; }
.rd__footer-amount { font-size: 20px; font-weight: 700; color: #e02424; }
.rd__book-btn { padding: 12px 28px; background: #1a56db; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; }

/* 日历弹窗 */
.rd__overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .4); z-index: 200; display: flex; align-items: flex-end; }
.rd__calendar { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 16px; max-height: 70vh; overflow-y: auto; }
.rd__calendar-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; text-align: center; }
.rd__calendar-week { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 8px; }
.rd__calendar-weekday { font-size: 12px; color: #999; }
.rd__calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.rd__cal-day { text-align: center; padding: 6px 2px; border-radius: 6px; cursor: pointer; min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rd__cal-day--empty { cursor: default; }
.rd__cal-day--past { color: #ddd; cursor: default; }
.rd__cal-day--selected { background: #1a56db; color: #fff; }
.rd__cal-day--today { border: 1px solid #1a56db; }
.rd__cal-day--in-range { background: #e6f0ff; }
.rd__cal-num { font-size: 14px; }
.rd__cal-price { font-size: 10px; color: #e02424; }
.rd__cal-day--selected .rd__cal-price { color: #fff; }
</style>
