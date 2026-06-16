<template>
  <div class="home">
    <!-- Hero -->
    <div class="hero">
      <div class="hero__glow"></div>
      <div class="hero__grid"></div>
      <p class="hero__tag">WELCOME TO WUXIAN HOTEL</p>
      <h1 class="hero__title">寻找你的专属住所</h1>
      <div class="hero__search" v-if="!isAudit" @click="$router.push('/rooms')">
        <Search class="hero__search-icon" :size="16" :stroke-width="2" />
        <span>搜索房型、设施...</span>
      </div>
    </div>

    <!-- Banner 轮播 -->
    <div class="banner" v-if="banners.length">
      <div class="banner__track" :style="{ transform: `translateX(-${currentBanner * 100}%)` }">
        <div
          v-for="b in banners" :key="b.id"
          class="banner__slide"
          @click="onBannerClick(b)"
        >
          <img :src="b.image" :alt="b.title || 'Banner'" class="banner__img" />
        </div>
      </div>
      <div class="banner__dots" v-if="banners.length > 1">
        <span
          v-for="(b, i) in banners" :key="b.id"
          class="banner__dot"
          :class="{ 'banner__dot--active': i === currentBanner }"
          @click="currentBanner = i"
        ></span>
      </div>
    </div>

    <!-- 地址 & 电话 -->
    <div class="contact" v-if="hotel.address">
      <div class="contact__item contact__address" @click="openNav">
        <MapPin :size="18" :stroke-width="1.5" />
        <span>{{ hotel.address }}</span>
        <ChevronRight :size="14" class="contact__arrow" />
      </div>
      <div class="contact__divider"></div>
      <a class="contact__item contact__phone" @click="callPhone">
        <Phone :size="18" :stroke-width="1.5" />
        <span>{{ hotel.phone }}</span>
        <ChevronRight :size="14" class="contact__arrow" />
      </a>
    </div>

    <!-- 快捷入口 -->
    <div class="quick" v-if="!isAudit">
      <div v-for="item in quickItems" :key="item.path" class="quick__item" @click="$router.push(item.path)">
        <component :is="item.icon" :size="30" :stroke-width="1.5" class="quick__icon" />
        <span class="quick__label">{{ item.label }}</span>
      </div>
    </div>

    <!-- 热门房型 -->
    <div class="section" v-if="!isAudit">
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
          :class="{ 'room-card--static': isAudit }"
          :style="{ animationDelay: idx * .1 + 's' }"
          @click="!isAudit && $router.push(`/room/${room.id}`)"
        >
          <div class="room-card__img-wrap">
            <img v-if="room.imageUrl" :src="room.imageUrl" :alt="room.name" class="room-card__img" />
            <div v-else class="room-card__img room-card__img--ph"><BedSingle :size="36" :stroke-width="1.5" /></div>
          </div>
          <div class="room-card__body">
            <h4 class="room-card__name">{{ room.name }}</h4>
            <div class="room-card__tags">
              <span v-if="room.area">{{ room.area }}㎡</span>
              <span v-if="room.bed_type">{{ room.bed_type }}</span>
              <span v-if="room.pcCount">{{ room.pcCount }}台电脑</span>
              <span v-if="room.pcConfigs && room.pcConfigs[0]">{{ room.pcConfigs[0] }}</span>
              <span v-for="(f, i) in room.facilities.slice(0,2)" :key="i">{{ f }}</span>
            </div>
            <div class="room-card__footer">
              <span class="room-card__price">¥{{ room.price }}<sub>/晚</sub></span>
              <span v-if="!isAudit" class="room-card__btn">预订 <ChevronRight :size="14" /></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 住客好评 -->
    <div class="section" v-if="reviews.length">
      <div class="section__head"><h3 class="section__title">住客好评</h3></div>
      <div class="reviews">
        <div v-for="r in reviews" :key="r.id" class="reviews__item">
          <div class="reviews__header">
            <span class="reviews__user">{{ r.nickname }}</span>
            <span class="reviews__stars">{{ '★'.repeat(r.score) }}{{ '☆'.repeat(5 - r.score) }}</span>
          </div>
          <p class="reviews__text">"{{ r.content }}"</p>
          <span class="reviews__date">{{ fmtReviewDate(r.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue';
import { Search, Megaphone, BedSingle, ChevronRight, ArrowRight, Gem, Gift, ClipboardList, MapPin, Phone } from 'lucide-vue-next';
import { useAuditMode } from '../utils/audit.js';

const { isAudit } = useAuditMode();

const rooms = ref([]);
const loading = ref(true);
const banners = ref([]);
const currentBanner = ref(0);
const hotel = reactive({ address: '', phone: '', latitude: 0, longitude: 0 });
const quickItems = [
  { path: '/rooms', icon: BedSingle, label: '客房预订' },
  { path: '/orders', icon: ClipboardList, label: '我的订单' },
  { path: '/member', icon: Gem, label: '会员中心' },
  { path: '/mall', icon: Gift, label: '积分商城' },
];

const facilityMap = [
  { key: 'tv', name: '智能电视' }, { key: 'ac', name: '空调' },
  { key: 'wifi', name: '免费WiFi' }, { key: 'bathtub', name: '独立浴缸' },
];

// 最新评价
const reviews = ref([]);

function fmtReviewDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

onMounted(async () => {
  try {
    const { default: api } = await import('../utils/api.js');
    const [roomRes, configRes, bannerRes, reviewRes] = await Promise.all([
      api.getRooms().catch(() => ({ data: { list: [] } })),
      api.getHotelConfig().catch(() => ({ data: {} })),
      api.getBanners().catch(() => ({ data: [] })),
      api.getLatestReviews().catch(() => ({ data: [] })),
    ]);
    rooms.value = ((roomRes.data?.list || [])).slice(0, 4).map(r => ({
      ...r,
      facilities: facilityMap.filter(f => r[f.key]).map(f => f.name),
    }));
    const cfg = configRes.data || {};
    hotel.address = cfg.hotel_address || '';
    hotel.phone = cfg.hotel_phone || '';
    hotel.latitude = parseFloat(cfg.hotel_latitude) || 0;
    hotel.longitude = parseFloat(cfg.hotel_longitude) || 0;
    banners.value = bannerRes.data || [];
    reviews.value = reviewRes.data || [];

    // 检查 Token 是否已被管理员撤销（仅对已有 token 且已记录过检查时间的用户生效）
    const curToken = localStorage.getItem('hotel_h5_token');
    if (cfg.mp_token_revoked_at && curToken) {
      const revokedAt = new Date(cfg.mp_token_revoked_at).getTime();
      const storedAt = parseInt(localStorage.getItem('mp_token_checked_at') || '0', 10);
      // storedAt=0 表示首次检查，不撤销（允许新用户正常登录）
      if (storedAt > 0 && revokedAt > storedAt) {
        console.log('[revoke] 检测到管理员撤销token，清除登录状态');
        localStorage.removeItem('hotel_h5_token');
        localStorage.removeItem('hotel_h5_user');
      }
      localStorage.setItem('mp_token_checked_at', String(revokedAt));
    }
  } catch { /* ignore */ }
  finally { loading.value = false; }
});

// Banner 自动轮播
let bannerTimer = 0;
function startAutoPlay() {
  if (banners.value.length <= 1) return;
  clearInterval(bannerTimer);
  bannerTimer = setInterval(() => {
    currentBanner.value = (currentBanner.value + 1) % banners.value.length;
  }, 3000);
}
watch(banners, (val) => {
  if (val.length > 1) startAutoPlay();
}, { immediate: true });
onUnmounted(() => clearInterval(bannerTimer));

function onBannerClick(b) {
  if (b.link_url) {
    window.location.href = b.link_url;
  }
}

// 检测是否在小程序 WebView 中
function isInMiniProgram() {
  if (typeof wx !== 'undefined' && wx.miniProgram) return true;
  return /miniProgram/i.test(navigator.userAgent);
}

// 导航：小程序跳转到中转页→打开原生地图→关闭自动返回H5
// 浏览器用 window.open 避免替换当前页
function openNav() {
  const { latitude, longitude, address } = hotel;
  const lat = latitude || 24.315;
  const lng = longitude || 109.413;
  const name = '柳州无限电竞酒店';

  if (isInMiniProgram()) {
    const addr = encodeURIComponent(address || '');
    wx.miniProgram.navigateTo({
      url: `/pages/location/location?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}&addr=${addr}`,
    });
    return;
  }

  const url = `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng};title:${encodeURIComponent(name)};addr:${encodeURIComponent(address || '')}&referer=wxhotel`;
  const w = window.open(url, '_blank');
  if (!w) window.location.href = url;
}

// 电话：小程序/浏览器均可用 tel: 协议
function callPhone(e) {
  e?.preventDefault?.();
  if (!hotel.phone) return;
  window.location.href = `tel:${hotel.phone}`;
}

</script>

<style scoped>
.hero {
  position: relative; padding: 20px 20px 18px; overflow: hidden;
  background: linear-gradient(160deg, #0a1628 0%, #131e3a 40%, #1a0a2e 100%);
}
.hero__glow { position: absolute; top: -40%; right: -20%; width: 200px; height: 200px; background: radial-gradient(circle, rgba(0,212,255,.1), transparent 70%); pointer-events: none; }
.hero__grid { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,212,255,.03) 1px, transparent 1px), linear-gradient(rgba(0,212,255,.03) 1px, transparent 1px); background-size: 30px 30px; pointer-events: none; }
.hero__tag { font-family: var(--font-display); font-size: 9px; letter-spacing: 2px; color: var(--neon-cyan); margin-bottom: 4px; opacity: .8; }
.hero__title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 12px; letter-spacing: 1px; }
.hero__search { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: var(--radius-md); padding: 10px 14px; color: var(--text-muted); font-size: 13px; cursor: pointer; transition: border-color var(--dur-normal); }
.hero__search:hover { border-color: var(--border-glow); }
.hero__search-icon { color: var(--text-muted); flex-shrink: 0; }

.notice { display: flex; align-items: center; gap: 10px; margin: 14px; padding: 12px 14px; background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.15); border-radius: var(--radius-md); font-size: 12px; color: var(--neon-gold); }
.notice :deep(svg) { flex-shrink: 0; }

/* Banner */
.banner { margin: 6px 14px; border-radius: var(--radius-md); overflow: hidden; position: relative; }
.banner__track { display: flex; transition: transform .5s cubic-bezier(.25,.1,.25,1); }
.banner__slide { flex: 0 0 100%; cursor: pointer; }
.banner__img { width: 100%; height: 130px; object-fit: cover; display: block; }
.banner__dots { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; }
.banner__dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.4); cursor: pointer; transition: all var(--dur-fast); }
.banner__dot--active { width: 16px; border-radius: 3px; background: var(--neon-cyan); }

.contact { margin: 0 14px 6px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
.contact__item { display: flex; align-items: center; gap: 10px; padding: 14px; font-size: 13px; color: var(--text-secondary); cursor: pointer; transition: background var(--dur-fast); text-decoration: none; }
.contact__item:hover { background: rgba(0,212,255,.04); }
.contact__item :deep(svg:first-child) { color: var(--neon-cyan); flex-shrink: 0; }
.contact__arrow { color: var(--text-muted); margin-left: auto; flex-shrink: 0; }
.contact__divider { height: 1px; background: var(--border-subtle); margin: 0 14px; }

.quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 0 14px; margin-bottom: 8px; }
.quick__item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; aspect-ratio: 1; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; transition: all var(--dur-normal) var(--ease-out); }
.quick__item:hover { border-color: var(--border-glow); transform: translateY(-2px); }
.quick__icon { color: var(--neon-cyan); }
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
.room-card--static { cursor: default; }
.room-card--static:hover { border-color: var(--border-subtle); transform: none; }
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

/* 住客好评 */
.reviews { padding: 0 14px; display: flex; flex-direction: column; gap: 10px; }
.reviews__item {
  padding: 14px; background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.reviews__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.reviews__user { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.reviews__stars { font-size: 12px; color: var(--neon-gold); letter-spacing: 1px; }
.reviews__text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 6px; }
.reviews__date { font-size: 11px; color: var(--text-muted); }
</style>
