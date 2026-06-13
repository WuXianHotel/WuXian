<template>
  <div class="rd">
    <NavBar title="房型详情" />

    <div class="rd__hero">
      <img v-if="room.imageUrl" :src="room.imageUrl" :alt="room.name" class="rd__hero-img" />
      <div v-else class="rd__hero-img rd__hero-img--ph"><BedSingle :size="72" :stroke-width="1" /></div>
    </div>

    <div class="rd__card">
      <h1 class="rd__name">{{ room.name || '加载中...' }}</h1>
      <div class="rd__rating">
        <Star v-for="i in 5" :key="i" :size="14" fill="var(--neon-gold)" color="var(--neon-gold)" />
        <strong>{{ room.rating || '4.9' }}</strong>
        <span>{{ room.review_count || 0 }}条评价</span>
      </div>
      <div class="rd__attrs">
        <div v-if="room.area" class="rd__attr"><Ruler :size="16" /><span>{{ room.area }}㎡</span></div>
        <div v-if="room.bed_type" class="rd__attr"><BedSingle :size="16" /><span>{{ room.bed_type }}</span></div>
        <div v-if="room.max_guests" class="rd__attr"><Users :size="16" /><span>最多{{ room.max_guests }}人</span></div>
        <div v-if="room.view_type" class="rd__attr"><Building2 :size="16" /><span>{{ room.view_type }}</span></div>
      </div>
    </div>

    <div class="rd__card">
      <h3 class="rd__section-title">房价日历</h3>
      <div class="rd__date-pick">
        <div class="rd__date-item"><span>入住</span><strong>{{ checkInLabel || '选择日期' }}</strong></div>
        <span class="rd__arrow"><ArrowRight :size="16" /></span>
        <div class="rd__date-item"><span>退房</span><strong>{{ checkOutLabel || '选择日期' }}</strong></div>
        <span class="rd__nights">{{ nights }}晚</span>
      </div>
      <div class="rd__cal-week"><span v-for="d in weekDays" :key="d">{{ d }}</span></div>
      <div class="rd__cal-grid">
        <div v-for="(day,i) in calendarDays" :key="i" class="rd__cal-cell" :class="[`rd__cal-cell--${day.type||'normal'}`]" @click="selectDate(day)">
          <span>{{ day.day }}</span><span v-if="day.price" class="rd__cal-price">¥{{ day.price }}</span>
        </div>
      </div>
    </div>

    <div class="rd__card">
      <h3 class="rd__section-title">房间设施</h3>
      <div class="rd__facs">
        <div v-for="(f,i) in facilities" :key="i" class="rd__fac">
          <component :is="f.icon" :size="22" :stroke-width="1.5" />
          <span>{{ f.name }}</span>
        </div>
      </div>
    </div>

    <div class="rd__card">
      <h3 class="rd__section-title">用户评价</h3>
      <div class="rd__review-summary">
        <div class="rd__big-score">{{ room.rating || '4.9' }}</div>
        <div class="rd__bars">
          <div v-for="item in ratingDist" :key="item.star" class="rd__bar">
            <span>{{ item.star }}<Star :size="10" fill="var(--neon-gold)" /></span>
            <div class="rd__bar-bg"><div class="rd__bar-fill" :style="{width:item.pct+'%'}"></div></div>
          </div>
        </div>
      </div>
      <div v-for="r in reviews" :key="r.id" class="rd__review">
        <div class="rd__review-head">
          <div class="rd__avatar"><User :size="16" /></div>
          <div>
            <div class="rd__review-name">{{ r.nickname }}</div>
            <div class="rd__review-date">{{ r.date }}</div>
          </div>
        </div>
        <div class="rd__review-stars"><Star v-for="i in 5" :key="i" :size="11" fill="var(--neon-gold)" color="var(--neon-gold)" /></div>
        <p>{{ r.content }}</p>
      </div>
    </div>

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
import { BedSingle, Star, Ruler, Users, Building2, ArrowRight, Tv, Wind, Wifi, Waves, Coffee, Droplets, Shirt, Car, User } from 'lucide-vue-next';
import NavBar from '../components/NavBar.vue';

const route = useRoute();
const router = useRouter();
const room = ref({}); const nights = ref(1);
const checkIn = ref(''); const checkOut = ref('');
const checkInLabel = ref(''); const checkOutLabel = ref('');
const calendarDays = ref([]);
const weekDays = ['日','一','二','三','四','五','六'];
const reviews = ref([]);
const ratingDist = ref([{star:5,pct:85},{star:4,pct:12},{star:3,pct:3},{star:2,pct:0}]);
const facilities = ref([]);

const facilityMeta = [
  {key:'tv',name:'智能电视',icon:Tv},{key:'ac',name:'空调',icon:Wind},
  {key:'wifi',name:'免费WiFi',icon:Wifi},{key:'bathtub',name:'独立浴缸',icon:Waves},
  {key:'coffee',name:'咖啡机',icon:Coffee},{key:'toiletries',name:'洗漱用品',icon:Droplets},
  {key:'washer',name:'洗衣机',icon:Shirt},{key:'parking',name:'免费停车',icon:Car},
];

const todayStr = ()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const addDays=(s,n)=>{const d=new Date(s);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
const calcNights=(a,b)=>Math.round((new Date(b)-new Date(a))/86400000);
const fmtDate=ds=>{const d=new Date(ds);const wm=['周日','周一','周二','周三','周四','周五','周六'];return `${d.getMonth()+1}月${d.getDate()}日 ${wm[d.getDay()]}`;};

onMounted(async()=>{
  const id=route.params.id;
  const ci=todayStr(),co=addDays(ci,1);
  checkIn.value=ci;checkOut.value=co;checkInLabel.value=fmtDate(ci);checkOutLabel.value=fmtDate(co);
  try{const{default:api}=await import('../utils/api.js');const res=await api.getRoomDetail(id);const r=res.data||{};room.value=r;facilities.value=facilityMeta.filter(f=>r[f.key]);buildCalendar();
    // 使用后端返回的评价数据
    if(r.latestReviews?.length){
      reviews.value=r.latestReviews.map(rv=>({id:rv.id,nickname:rv.nickname||'用户',date:(rv.created_at||'').slice(0,10),content:rv.content}));
    } else {
      reviews.value=[{id:1,nickname:'暂无评价',date:'',content:'成为第一个评价的用户吧！'}];
    }
    if(r.scoreDist?.length){
      const total=r.scoreDist.reduce((s,i)=>s+i.cnt,0)||1;
      ratingDist.value = r.scoreDist.map(d=>({star:d.score,pct:Math.round(d.cnt/total*100)}));
    }
  }catch{}
});

function buildCalendar(){
  const today=new Date();today.setHours(0,0,0,0);
  const y=today.getFullYear(),m=today.getMonth();
  const fd=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate();
  const days=[];
  for(let i=0;i<fd;i++)days.push({date:'',day:'',type:'empty'});
  for(let d=1;d<=dim;d++){const date=new Date(y,m,d);date.setHours(0,0,0,0);const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;let type='normal';if(date<today)type='past';else if(ds===checkIn.value||ds===checkOut.value)type='selected';else if(ds>checkIn.value&&ds<checkOut.value)type='in-range';else if(date.getTime()===today.getTime())type='today';days.push({date:ds,day:d,type,price:date>=today?room.value.price:null});}
  calendarDays.value=days;
}
function selectDate(day){if(!day.date||day.type==='past')return;if(!checkIn.value||(checkIn.value&&checkOut.value)){checkIn.value=day.date;checkOut.value='';checkInLabel.value=fmtDate(day.date);checkOutLabel.value='';}else{if(day.date<=checkIn.value){checkIn.value=day.date;checkInLabel.value=fmtDate(day.date);}else{checkOut.value=day.date;checkOutLabel.value=fmtDate(day.date);nights.value=calcNights(checkIn.value,day.date);}}buildCalendar();}
function goBook(){if(!checkIn.value||!checkOut.value){alert('请先选择日期');return;}router.push(`/order/create?roomId=${route.params.id}&checkIn=${checkIn.value}&checkOut=${checkOut.value}`);}
</script>

<style scoped>
.rd{padding-bottom:calc(64px + env(safe-area-inset-bottom))}
.rd__hero{height:240px;overflow:hidden}.rd__hero-img{width:100%;height:100%;object-fit:cover}.rd__hero-img--ph{display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(0,212,255,.1),rgba(168,85,247,.1));color:var(--neon-cyan)}
.rd__card{margin:10px 14px;padding:16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}
.rd__name{font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:8px}
.rd__rating{display:flex;align-items:center;gap:4px;margin-bottom:14px;font-size:14px;color:var(--text-primary)}
.rd__rating span{font-size:12px;color:var(--text-muted);margin-left:4px}
.rd__attrs{display:flex;gap:8px;flex-wrap:wrap}
.rd__attr{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;border-radius:var(--radius-sm);background:rgba(255,255,255,.03);border:1px solid var(--border-subtle);font-size:11px;color:var(--text-secondary)}
.rd__section-title{font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:12px}
.rd__date-pick{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--radius-sm);background:rgba(0,212,255,.04);border:1px solid var(--border-subtle);margin-bottom:14px;cursor:pointer}
.rd__date-item{text-align:center}.rd__date-item span{display:block;font-size:10px;color:var(--text-muted)}.rd__date-item strong{font-size:14px;color:var(--text-primary)}
.rd__arrow{color:var(--neon-cyan)}.rd__nights{padding:3px 10px;border-radius:var(--radius-full);background:rgba(0,212,255,.1);color:var(--neon-cyan);font-size:11px;font-weight:600}
.rd__cal-week{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:11px;color:var(--text-muted);margin-bottom:4px}
.rd__cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.rd__cal-cell{text-align:center;padding:6px 2px;font-size:12px;border-radius:6px;cursor:pointer;min-height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-secondary)}
.rd__cal-cell--empty{cursor:default}.rd__cal-cell--past{color:var(--text-muted);cursor:default}.rd__cal-cell--today{background:var(--bg-card);border:1px solid var(--neon-cyan);color:var(--neon-cyan)}.rd__cal-cell--selected{background:rgba(0,212,255,.12);color:var(--neon-cyan)}.rd__cal-cell--in-range{background:rgba(0,212,255,.05)}.rd__cal-price{font-size:9px;margin-top:1px}.rd__cal-cell--today .rd__cal-price{color:var(--neon-cyan)}
.rd__facs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.rd__fac{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:var(--text-secondary)}
.rd__review-summary{display:flex;gap:16px;align-items:center;margin-bottom:14px}.rd__big-score{font-size:40px;font-weight:800;color:var(--neon-cyan)}.rd__bars{flex:1}.rd__bar{display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px;color:var(--text-muted)}.rd__bar-bg{flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px}.rd__bar-fill{height:4px;background:var(--neon-gold);border-radius:2px}
.rd__review{padding:12px;background:rgba(255,255,255,.02);border-radius:var(--radius-sm);border:1px solid var(--border-subtle);margin-bottom:8px}.rd__review-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}.rd__avatar{width:32px;height:32px;border-radius:50%;background:rgba(0,212,255,.1);display:flex;align-items:center;justify-content:center;color:var(--neon-cyan)}.rd__review-name{font-size:13px;font-weight:600;color:var(--text-primary)}.rd__review-date{font-size:11px;color:var(--text-muted)}.rd__review-stars{margin-bottom:6px}.rd__review p{font-size:12px;color:var(--text-secondary);line-height:1.6}
.rd__bar{position:fixed;bottom:0;left:0;right:0;z-index:20;height:calc(64px + env(safe-area-inset-bottom));padding:12px 16px 0;padding-bottom:env(safe-area-inset-bottom);background:rgba(10,14,26,.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;box-sizing:border-box}.rd__bar-label{display:block;font-size:11px;color:var(--text-muted)}.rd__bar-price{font-size:22px;font-weight:700;color:var(--neon-cyan)}.rd__bar-price sub{font-size:12px;font-weight:400;color:var(--text-muted)}.rd__book-btn{padding:12px 32px;border-radius:var(--radius-full);font-size:15px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--neon-cyan),var(--neon-purple));transition:all var(--dur-normal) var(--ease-out)}.rd__book-btn:hover{transform:translateY(-2px);box-shadow:var(--shadow-glow-cyan)}
</style>
