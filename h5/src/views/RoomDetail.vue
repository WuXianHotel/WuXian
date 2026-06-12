<template>
  <div class="rd">
    <NavBar title="房型详情" />

    <!-- Hero 图 -->
    <div class="rd__hero">
      <img v-if="room.image_url" :src="room.image_url" :alt="room.name" class="rd__hero-img" />
      <div v-else class="rd__hero-img rd__hero-img--ph">🛏️</div>
    </div>

    <!-- 基本信息 -->
    <div class="rd__card">
      <h1 class="rd__name">{{ room.name || '加载中...' }}</h1>
      <div class="rd__rating">
        <span class="rd__stars">{{ '★'.repeat(5) }}</span>
        <strong>{{ room.rating || '4.9' }}</strong>
        <span>{{ room.review_count || 0 }}条评价</span>
      </div>
      <div class="rd__attrs">
        <div v-if="room.area" class="rd__attr"><span>📐</span><span>{{ room.area }}㎡</span></div>
        <div v-if="room.bed_type" class="rd__attr"><span>🛏</span><span>{{ room.bed_type }}</span></div>
        <div v-if="room.max_guests" class="rd__attr"><span>👥</span><span>最多{{ room.max_guests }}人</span></div>
        <div v-if="room.view_type" class="rd__attr"><span>🏙</span><span>{{ room.view_type }}</span></div>
      </div>
    </div>

    <!-- 日期选择 -->
    <div class="rd__card">
      <h3 class="rd__section-title">房价日历</h3>
      <div class="rd__date-pick" @click="startPick">
        <div class="rd__date-item">
          <span>入住</span>
          <strong>{{ checkInLabel || '选择日期' }}</strong>
        </div>
        <span class="rd__arrow">→</span>
        <div class="rd__date-item">
          <span>退房</span>
          <strong>{{ checkOutLabel || '选择日期' }}</strong>
        </div>
        <span class="rd__nights">{{ nights }}晚</span>
      </div>

      <div class="rd__cal-week">
        <span v-for="d in weekDays" :key="d">{{ d }}</span>
      </div>
      <div class="rd__cal-grid">
        <div
          v-for="(day,i) in calendarDays" :key="i"
          class="rd__cal-cell"
          :class="[`rd__cal-cell--${day.type||'normal'}`]"
          @click="selectDate(day)"
        >
          <span>{{ day.day }}</span>
          <span v-if="day.price" class="rd__cal-price">¥{{ day.price }}</span>
        </div>
      </div>
    </div>

    <!-- 设施 -->
    <div class="rd__card">
      <h3 class="rd__section-title">房间设施</h3>
      <div class="rd__facs">
        <div v-for="(f,i) in facilities" :key="i" class="rd__fac">
          <span>{{ f.emoji }}</span>
          <span>{{ f.name }}</span>
        </div>
      </div>
    </div>

    <!-- 评价 -->
    <div class="rd__card">
      <h3 class="rd__section-title">用户评价</h3>
      <div class="rd__review-summary">
        <div class="rd__big-score">{{ room.rating || '4.9' }}</div>
        <div class="rd__bars">
          <div v-for="item in ratingDist" :key="item.star" class="rd__bar">
            <span>{{ item.star }}★</span>
            <div class="rd__bar-bg"><div class="rd__bar-fill" :style="{width:item.pct+'%'}"></div></div>
          </div>
        </div>
      </div>
      <div v-for="r in reviews" :key="r.id" class="rd__review">
        <div class="rd__review-head">
          <div class="rd__avatar">{{ r.avatarEmoji||'😊' }}</div>
          <div>
            <div class="rd__review-name">{{ r.nickname }}</div>
            <div class="rd__review-date">{{ r.date }}</div>
          </div>
        </div>
        <div class="rd__review-stars">{{ '★'.repeat(5) }}</div>
        <p>{{ r.content }}</p>
      </div>
    </div>

    <!-- 底部预订栏 -->
    <div class="rd__bar">
      <div>
        <span class="rd__bar-label">每晚起</span>
        <span class="rd__bar-price">¥{{ room.price || 0 }}<sub>/晚</sub></span>
      </div>
      <button class="rd__book-btn" @click="goBook">立即预订</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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
const calendarDays = ref([]);
const weekDays = ['日','一','二','三','四','五','六'];
const reviews = ref([]);
const ratingDist = [{star:5,pct:85},{star:4,pct:12},{star:3,pct:3},{star:2,pct:0}];
const facilities = ref([]);
const facilityMeta = [
  {key:'tv',name:'智能电视',emoji:'📺'},{key:'ac',name:'空调',emoji:'🌬'},
  {key:'wifi',name:'免费WiFi',emoji:'📶'},{key:'bathtub',name:'独立浴缸',emoji:'🛁'},
  {key:'coffee',name:'咖啡机',emoji:'☕'},{key:'toiletries',name:'洗漱用品',emoji:'🧴'},
  {key:'washer',name:'洗衣机',emoji:'🧺'},{key:'parking',name:'免费停车',emoji:'🚗'},
];

const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const addDays = (s,n) => { const d=new Date(s); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const calcNights = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const fmtDate = ds => { const d=new Date(ds); const wm=['周日','周一','周二','周三','周四','周五','周六']; return `${d.getMonth()+1}月${d.getDate()}日 ${wm[d.getDay()]}`; };

onMounted(async ()=>{
  const id = route.params.id;
  const ci=todayStr(), co=addDays(ci,1);
  checkIn.value=ci; checkOut.value=co;
  checkInLabel.value=fmtDate(ci); checkOutLabel.value=fmtDate(co);
  try{
    const {default:api}=await import('../utils/api.js');
    const res=await api.getRoomDetail(id);
    const r=res.data||{};
    room.value=r;
    facilities.value=facilityMeta.filter(f=>r[f.key]);
    buildCalendar();
  }catch{}
  reviews.value=[
    {id:1,avatarEmoji:'😊',nickname:'王**',date:'2026-04-20',content:'房间超大，设施非常齐全，浴缸是我见过最舒适的！'},
    {id:2,avatarEmoji:'😄',nickname:'李**',date:'2026-04-15',content:'城市景观很棒，早上起来看日出太美了。性价比高！'},
  ];
});

function buildCalendar(){
  const today=new Date(); today.setHours(0,0,0,0);
  const y=today.getFullYear(),m=today.getMonth();
  const fd=new Date(y,m,1).getDay();
  const dim=new Date(y,m+1,0).getDate();
  const days=[];
  for(let i=0;i<fd;i++) days.push({date:'',day:'',type:'empty'});
  for(let d=1;d<=dim;d++){
    const date=new Date(y,m,d); date.setHours(0,0,0,0);
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let type='normal';
    if(date<today) type='past';
    else if(ds===checkIn.value||ds===checkOut.value) type='selected';
    else if(ds>checkIn.value&&ds<checkOut.value) type='in-range';
    else if(date.getTime()===today.getTime()) type='today';
    days.push({date:ds,day:d,type,price:date>=today?room.value.price:null});
  }
  calendarDays.value=days;
}
function startPick(){ /* 日历已在页面上 */ }
function selectDate(day){
  if(!day.date||day.type==='past') return;
  if(!checkIn.value||(checkIn.value&&checkOut.value)){
    checkIn.value=day.date; checkOut.value='';
    checkInLabel.value=fmtDate(day.date); checkOutLabel.value='';
  }else{
    if(day.date<=checkIn.value){ checkIn.value=day.date; checkInLabel.value=fmtDate(day.date); }
    else{ checkOut.value=day.date; checkOutLabel.value=fmtDate(day.date); nights.value=calcNights(checkIn.value,day.date); }
  }
  buildCalendar();
}
function goBook(){
  if(!checkIn.value||!checkOut.value){ alert('请先选择日期'); return; }
  router.push(`/order/create?roomId=${route.params.id}&checkIn=${checkIn.value}&checkOut=${checkOut.value}`);
}
</script>

<style scoped>
.rd__hero { height: 240px; overflow: hidden; }
.rd__hero-img { width: 100%; height: 100%; object-fit: cover; }
.rd__hero-img--ph { display: flex; align-items: center; justify-content: center; font-size: 72px; background: linear-gradient(135deg, rgba(0,212,255,.1), rgba(168,85,247,.1)); }

.rd__card {
  margin: 10px 14px; padding: 16px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.rd__name { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.rd__rating { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.rd__stars { color: var(--neon-gold); font-size: 13px; }
.rd__rating strong { font-size: 14px; color: var(--text-primary); }
.rd__rating span:last-child { font-size: 12px; color: var(--text-muted); }

.rd__attrs { display: flex; gap: 8px; flex-wrap: wrap; }
.rd__attr {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 14px; border-radius: var(--radius-sm);
  background: rgba(255,255,255,.03); border: 1px solid var(--border-subtle);
  font-size: 11px; color: var(--text-secondary);
}
.rd__attr span:first-child { font-size: 18px; }

.rd__section-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }

.rd__date-pick {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: var(--radius-sm);
  background: rgba(0,212,255,.04); border: 1px solid var(--border-subtle);
  margin-bottom: 14px; cursor: pointer;
}
.rd__date-item { text-align: center; }
.rd__date-item span { display: block; font-size: 10px; color: var(--text-muted); }
.rd__date-item strong { font-size: 14px; color: var(--text-primary); }
.rd__arrow { color: var(--neon-cyan); }
.rd__nights { padding: 3px 10px; border-radius: var(--radius-full); background: rgba(0,212,255,.1); color: var(--neon-cyan); font-size: 11px; font-weight: 600; }

.rd__cal-week { display: grid; grid-template-columns: repeat(7,1fr); text-align: center; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.rd__cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
.rd__cal-cell { text-align: center; padding: 6px 2px; font-size: 12px; border-radius: 6px; cursor: pointer; min-height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-secondary); }
.rd__cal-cell--empty { cursor: default; }
.rd__cal-cell--past { color: var(--text-muted); cursor: default; }
.rd__cal-cell--today { background: var(--bg-card); border: 1px solid var(--neon-cyan); color: var(--neon-cyan); }
.rd__cal-cell--selected { background: rgba(0,212,255,.12); color: var(--neon-cyan); }
.rd__cal-cell--in-range { background: rgba(0,212,255,.05); }
.rd__cal-price { font-size: 9px; margin-top: 1px; }
.rd__cal-cell--today .rd__cal-price { color: var(--neon-cyan); }

.rd__facs { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
.rd__fac { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 11px; color: var(--text-secondary); }
.rd__fac span:first-child { font-size: 22px; }

.rd__review-summary { display: flex; gap: 16px; align-items: center; margin-bottom: 14px; }
.rd__big-score { font-size: 40px; font-weight: 800; color: var(--neon-cyan); }
.rd__bars { flex: 1; }
.rd__bar { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 11px; color: var(--text-muted); }
.rd__bar-bg { flex: 1; height: 4px; background: rgba(255,255,255,.06); border-radius: 2px; }
.rd__bar-fill { height: 4px; background: var(--neon-gold); border-radius: 2px; }

.rd__review { padding: 12px; background: rgba(255,255,255,.02); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-bottom: 8px; }
.rd__review-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.rd__avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(0,212,255,.1); display: flex; align-items: center; justify-content: center; }
.rd__review-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.rd__review-date { font-size: 11px; color: var(--text-muted); }
.rd__review-stars { color: var(--neon-gold); font-size: 12px; margin-bottom: 6px; }
.rd__review p { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }

.rd__bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  background: rgba(10,14,26,.95); backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-subtle);
  display: flex; align-items: center; justify-content: space-between;
}
.rd__bar-label { display: block; font-size: 11px; color: var(--text-muted); }
.rd__bar-price { font-size: 24px; font-weight: 700; color: var(--neon-cyan); }
.rd__bar-price sub { font-size: 12px; font-weight: 400; color: var(--text-muted); }
.rd__book-btn {
  padding: 14px 36px; border-radius: var(--radius-full);
  font-size: 16px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  transition: all var(--dur-normal) var(--ease-out);
}
.rd__book-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-glow-cyan); }
</style>
