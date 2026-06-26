<template>
  <div class="home">
    <!-- Hero -->
    <div class="hero">
      <p class="hero__tag">WELCOME TO WUXIAN HOTEL</p>
      <h1 class="hero__title">{{ isOnboarded === true ? '寻找你的专属住所' : '柳州无限电竞酒店' }}</h1>

      <!-- 检查中：不显示任何互动 -->
      <template v-if="isOnboarded === null"></template>

      <!-- 未完成引导：欢迎 + 登录/注册按钮 -->
      <template v-else-if="!isOnboarded">
        <p class="hero__welcome">沉浸式电竞体验，即刻开启你的专属旅程</p>
        <button class="hero__login-btn" @click="doLogin">
          <LogIn :size="18" :stroke-width="2" />
          <span>登录 / 注册</span>
        </button>
      </template>

      <!-- 已完成引导：搜索入口 -->
      <div v-else-if="!isAudit" class="hero__search" @click="$router.push('/rooms')">
        <Search class="hero__search-icon" :size="16" :stroke-width="2" />
        <span>搜索房型、设施...</span>
      </div>
    </div>

    <!-- 公告 -->
    <div class="notice">
      <Megaphone :size="16" :stroke-width="1.5" />
      <span>欢迎来到无限电竞酒店！</span>
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
    <div class="quick" v-if="isOnboarded === true && !isAudit">
      <div v-for="item in quickItems" :key="item.path" class="quick__item" @click="$router.push(item.path)">
        <component :is="item.icon" :size="30" :stroke-width="1.5" class="quick__icon" />
        <span class="quick__label">{{ item.label }}</span>
      </div>
    </div>

    <!-- 热门房型 -->
    <div class="section" v-if="isOnboarded === true && !isAudit">
      <div class="section__head">
        <h3 class="section__title">热门房型</h3>
        <span class="section__more" @click="$router.push('/rooms')">查看全部 <ArrowRight :size="14" class="section__more-icon" /></span>
      </div>

      <div v-if="loading" class="home__skeleton">
        <div v-for="i in 3" :key="i" class="skeleton" style="height:100px;margin-bottom:var(--space-sm);border-radius:var(--radius-md)"></div>
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

    <!-- 酒店特色 -->
    <div class="section" v-if="isAudit">
      <div class="section__head"><h3 class="section__title">酒店特色</h3></div>
      <div class="features">
        <div v-for="f in featureList" :key="f.label" class="features__item">
          <component :is="f.icon" :size="28" :stroke-width="1.5" class="features__icon" />
          <span class="features__label">{{ f.label }}</span>
          <span class="features__desc">{{ f.desc }}</span>
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


    <!-- 入住须知 -->
    <div class="section" v-if="isAudit && (hotel.check_in_time || hotel.check_out_time)">
      <div class="section__head"><h3 class="section__title">入住须知</h3></div>
      <div class="policy">
        <div class="policy__item">
          <Clock :size="20" :stroke-width="1.5" class="policy__icon" />
          <span class="policy__label">入住时间</span>
          <span class="policy__value">{{ hotel.check_in_time }}</span>
        </div>
        <div class="policy__item">
          <LogOut :size="20" :stroke-width="1.5" class="policy__icon" />
          <span class="policy__label">退房时间</span>
          <span class="policy__value">{{ hotel.check_out_time }}</span>
        </div>
      </div>
    </div>

    <!-- 周边推荐 -->
    <div class="section" v-if="isAudit">
      <div class="section__head"><h3 class="section__title">周边推荐</h3></div>
      <div class="nearby">
        <div v-for="n in nearbyList" :key="n.name" class="nearby__item" @click="openNearby(n)">
          <span class="nearby__icon">{{ n.emoji }}</span>
          <span class="nearby__name">{{ n.name }}</span>
          <span class="nearby__dist">{{ n.dist }}</span>
          <ChevronRight :size="14" class="nearby__arrow" />
        </div>
      </div>
    </div>


    <!-- 评分概览 -->
    <div class="section" v-if="reviewStats.total > 0">
      <div class="section__head"><h3 class="section__title">住客评价</h3></div>
      <div class="rating-overview">
        <div class="rating-overview__score">{{ reviewStats.avg }}</div>
        <div class="rating-overview__info">
          <div class="rating-overview__stars">{{ '★'.repeat(Math.round(reviewStats.avg)) }}{{ '☆'.repeat(5 - Math.round(reviewStats.avg)) }}</div>
          <span class="rating-overview__count">共 {{ reviewStats.total }} 条评价</span>
        </div>
      </div>
    </div>

    <!-- 底部信息 -->
    <footer class="home__footer">
      <p class="home__footer-name">{{ hotel.name || '柳州无限电竞酒店' }}</p>
      <p class="home__footer-copy">&copy; {{ new Date().getFullYear() }} WuXian Hotel</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Megaphone, BedSingle, ChevronRight, ArrowRight, Gem, Gift, ClipboardList, MapPin, Phone, LogIn, Wifi, Monitor, Car, Shield, Sparkles, Clock, LogOut } from 'lucide-vue-next';
import { getToken } from '../utils/auth.js';
import { useAuditMode } from '../utils/audit.js';

const router = useRouter();
const { isAudit } = useAuditMode();

// 通过接口判断是否已完成首次信息填写（null=检查中, true=已完成, false=未完成）
const isOnboarded = ref(null);

async function checkOnboardStatus() {
  // 审核模式：跳过登录，模拟已完成引导（不展示登录按钮）
  if (isAudit.value) {
    isOnboarded.value = true;
    localStorage.setItem('hotel_onboarded', '1');
    return;
  }

  if (!getToken()) {
    isOnboarded.value = false;
    localStorage.setItem('hotel_onboarded', '0');
    // 触发storage事件，让App.vue同步更新
    window.dispatchEvent(new StorageEvent('storage', { key: 'hotel_onboarded', newValue: '0' }));
    return;
  }
  try {
    const { default: api } = await import('../utils/api.js');
    const res = await api.getProfile();
    const u = res.data || {};
    // 手机号 + 真实姓名 + 身份证号 三者齐全才算已完成引导
    const done = !!(u.phone && u.real_name && u.id_number);
    isOnboarded.value = done;
    localStorage.setItem('hotel_onboarded', done ? '1' : '0');
    // 触发storage事件，让App.vue同步更新
    window.dispatchEvent(new StorageEvent('storage', { key: 'hotel_onboarded', newValue: done ? '1' : '0' }));
  } catch {
    isOnboarded.value = false;
    localStorage.setItem('hotel_onboarded', '0');
    // 触发storage事件，让App.vue同步更新
    window.dispatchEvent(new StorageEvent('storage', { key: 'hotel_onboarded', newValue: '0' }));
  }
}

const rooms = ref([]);
const loading = ref(true);
const banners = ref([]);
const currentBanner = ref(0);
const hotel = reactive({ name: '', address: '', phone: '', latitude: 0, longitude: 0, check_in_time: '', check_out_time: '' });
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

// 酒店特色
const featureList = [
  { icon: Monitor, label: '高端电竞设备', desc: 'RTX 4060 + 165Hz 高刷屏' },
  { icon: Wifi, label: '千兆光钎网络', desc: '游戏延迟 < 20ms' },
  { icon: Sparkles, label: '舒适电竞房', desc: '人体工学椅 + 独立卫浴' },
  { icon: Car, label: '免费停车', desc: '酒店专属停车场' },
  { icon: Shield, label: '24h 安保', desc: '全天候监控保障安全' },
  { icon: Clock, label: '灵活退房', desc: '会员延迟退房至 14:00' },
];

// 周边推荐
const nearbyList = [
  { name: '窑埠古镇', dist: '步行 2 分钟', emoji: '🏛️', lat: 24.327, lng: 109.264 },
  { name: '柳州工业博物馆', dist: '步行 5 分钟', emoji: '🏭', lat: 24.330, lng: 109.265 },
  { name: '柳江夜景', dist: '步行 8 分钟', emoji: '🌃', lat: 24.322, lng: 109.268 },
  { name: '五星步行街', dist: '驾车 10 分钟', emoji: '🛍️', lat: 24.317, lng: 109.410 },
];

// 最新评价
const reviews = ref([]);

// 评价统计
const reviewStats = computed(() => {
  const list = reviews.value;
  if (!list.length) return { avg: 0, total: 0 };
  const total = list.length;
  const sum = list.reduce((s, r) => s + (r.score || 0), 0);
  return { avg: (sum / total).toFixed(1), total };
});

function fmtReviewDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

onMounted(async () => {
  checkOnboardStatus();
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
    hotel.name = cfg.hotel_name || '';
    hotel.address = cfg.hotel_address || '';
    hotel.phone = cfg.hotel_phone || '';
    hotel.latitude = parseFloat(cfg.hotel_latitude) || 0;
    hotel.longitude = parseFloat(cfg.hotel_longitude) || 0;
    hotel.check_in_time = cfg.check_in_time || '';
    hotel.check_out_time = cfg.check_out_time || '';
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

// 登录/注册 → 跳转引导页
function doLogin() {
  // 有 token → 直接去填写信息
  if (getToken()) {
    router.push('/onboard');
    return;
  }
  // 无 token → 触发小程序重新授权
  if (isInMiniProgram()) {
    wx.miniProgram.postMessage({ data: { action: 'reAuth' } });
    wx.miniProgram.navigateBack({ delta: 0 });
    return;
  }
  // 非小程序环境：跳转登录提示页
  router.push('/auth-fail');
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

// 周边导航：复用酒店导航逻辑
function openNearby(n) {
  const isMini = typeof wx !== 'undefined' && wx.miniProgram;
  const name = encodeURIComponent(n.name);
  const lat = n.lat || 24.3282;
  const lng = n.lng || 109.2622;

  if (isMini) {
    wx.miniProgram.navigateTo({
      url: `/pages/location/location?lat=${lat}&lng=${lng}&name=${name}&addr=${name}`,
    });
    return;
  }

  const url = `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng};title=${name}&referer=wxhotel`;
  const w = window.open(url, '_blank');
  if (!w) window.location.href = url;
}
</script>

<style scoped>
.hero {
  position: relative; padding: var(--space-lg) var(--space-md) var(--space-sm); overflow: hidden;
}
.hero__tag { font-family: var(--font-display); font-size: 9px; letter-spacing: 2px; color: var(--neon-cyan); margin-bottom: var(--space-xs); opacity: .8; }
.hero__title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: var(--space-sm); letter-spacing: 1px; }
.hero__welcome { font-size: 14px; color: var(--text-secondary); margin-bottom: var(--space-lg); line-height: 1.6; }
.hero__login-btn {
  display: inline-flex; align-items: center; gap: var(--space-xs);
  padding: 12px 32px; border: 0; border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
  transition: all var(--dur-normal) var(--ease-out);
}
.hero__login-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-glow-cyan); }
.hero__login-btn:active { transform: scale(.97); }
.hero__search { display: flex; align-items: center; gap: var(--space-sm); background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: var(--radius-md); padding: var(--space-sm) var(--space-md); color: var(--text-muted); font-size: 13px; cursor: pointer; transition: border-color var(--dur-normal); }
.hero__search:hover { border-color: var(--border-glow); }
.hero__search-icon { color: var(--text-muted); flex-shrink: 0; }

.notice { display: flex; align-items: center; gap: var(--space-sm); margin: var(--space-md); padding: var(--space-sm) var(--space-md); background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.15); border-radius: var(--radius-md); font-size: 12px; color: var(--neon-gold); }
.notice :deep(svg) { flex-shrink: 0; }

/* Banner */
.banner { margin: var(--space-sm) var(--space-md); border-radius: var(--radius-md); overflow: hidden; position: relative; }
.banner__track { display: flex; transition: transform .5s cubic-bezier(.25,.1,.25,1); }
.banner__slide { flex: 0 0 100%; cursor: pointer; }
.banner__img { width: 100%; height: 130px; object-fit: cover; display: block; }
.banner__dots { position: absolute; bottom: var(--space-sm); left: 50%; transform: translateX(-50%); display: flex; gap: var(--space-xs); }
.banner__dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.4); cursor: pointer; transition: all var(--dur-fast); }
.banner__dot--active { width: 16px; border-radius: 3px; background: var(--neon-cyan); }

.contact { margin: 0 var(--space-md) var(--space-sm); background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
.contact__item { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-md); font-size: 13px; color: var(--text-secondary); cursor: pointer; transition: background var(--dur-fast); text-decoration: none; }
.contact__item:hover { background: rgba(0,212,255,.04); }
.contact__item :deep(svg:first-child) { color: var(--neon-cyan); flex-shrink: 0; }
.contact__arrow { color: var(--text-muted); margin-left: auto; flex-shrink: 0; }
.contact__divider { height: 1px; background: var(--border-subtle); margin: 0 var(--space-md); }

.quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-sm); padding: 0 var(--space-md); margin-bottom: var(--space-sm); }
.quick__item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-sm); aspect-ratio: 1; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; transition: all var(--dur-normal) var(--ease-out); }
.quick__item:hover { border-color: var(--border-glow); transform: translateY(-2px); }
.quick__icon { color: var(--neon-cyan); }
.quick__label { font-size: 11px; color: var(--text-secondary); }

.section { padding: var(--space-sm) var(--space-md) var(--space-lg); }
.section__head { display: flex; justify-content: space-between; align-items: center; padding: var(--space-sm) 0; }
.section__title { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.section__more { font-size: 12px; color: var(--neon-cyan); cursor: pointer; display: flex; align-items: center; gap: 2px; }
.section__more-icon { transition: transform var(--dur-fast); }
.section__more:hover .section__more-icon { transform: translateX(2px); }

.home__skeleton { padding-top: var(--space-sm); }

.room-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.room-card { display: flex; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; cursor: pointer; transition: all var(--dur-normal) var(--ease-out); }
.room-card--static { cursor: default; }
.room-card--static:hover { border-color: var(--border-subtle); transform: none; }
.room-card:hover { border-color: var(--border-glow); transform: translateX(4px); }
.room-card__img-wrap { width: 110px; flex-shrink: 0; }
.room-card__img { width: 100%; height: 100%; min-height: 100px; object-fit: cover; }
.room-card__img--ph { background: linear-gradient(135deg, rgba(0,212,255,.1), rgba(168,85,247,.1)); display: flex; align-items: center; justify-content: center; color: var(--neon-cyan); }
.room-card__body { flex: 1; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; }
.room-card__name { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-xs); }
.room-card__tags { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-xs); }
.room-card__tags span { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: rgba(0,212,255,.08); color: var(--neon-cyan); }
.room-card__footer { display: flex; justify-content: space-between; align-items: center; }
.room-card__price { font-size: 18px; font-weight: 700; color: var(--neon-cyan); }
.room-card__price sub { font-size: 11px; font-weight: 400; color: var(--text-muted); }
.room-card__btn { font-size: 12px; color: var(--neon-purple); font-weight: 600; display: flex; align-items: center; gap: 1px; transition: color var(--dur-fast); }
.room-card:hover .room-card__btn { color: var(--neon-cyan); }

/* 酒店特色 */
.features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 14px; }
.features__item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px 8px; background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); text-align: center;
}
.features__icon { color: var(--neon-cyan); }
.features__label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.features__desc { font-size: 11px; color: var(--text-muted); }

/* 住客好评 */
.reviews { display: flex; flex-direction: column; gap: var(--space-sm); }
.reviews__item {
  padding: var(--space-md); background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.reviews__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xs); }
.reviews__user { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.reviews__stars { font-size: 12px; color: var(--neon-gold); letter-spacing: 1px; }
.reviews__text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: var(--space-xs); }
.reviews__date { font-size: 11px; color: var(--text-muted); }

/* 周边推荐 */
.nearby { padding: 0 14px; display: flex; flex-direction: column; gap: 8px; }
.nearby__item {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); cursor: pointer; transition: border-color var(--dur-fast);
}
.nearby__item:hover { border-color: var(--border-glow); }
.nearby__icon { font-size: 24px; flex-shrink: 0; }
.nearby__name { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.nearby__dist { font-size: 11px; color: var(--text-muted); margin-left: auto; flex-shrink: 0; }
.nearby__arrow { color: var(--text-muted); flex-shrink: 0; margin-left: 8px; }

/* 入住须知 */
.policy { padding: 0 14px; display: flex; gap: var(--space-sm); }
.policy__item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px 8px; background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.policy__icon { color: var(--neon-cyan); margin-bottom: 2px; }
.policy__label { font-size: 11px; color: var(--text-muted); }
.policy__value { font-size: 15px; font-weight: 700; color: var(--text-primary); }

/* 评分概览 */
.rating-overview {
  padding: 0 14px; display: flex; align-items: center; gap: var(--space-md);
  padding: var(--space-md); background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.rating-overview__score { font-size: 36px; font-weight: 800; color: var(--neon-gold); line-height: 1; }
.rating-overview__info { display: flex; flex-direction: column; gap: 2px; }
.rating-overview__stars { font-size: 14px; color: var(--neon-gold); letter-spacing: 2px; }
.rating-overview__count { font-size: 12px; color: var(--text-muted); }

/* 底部 */
.home__footer {
  margin-top: var(--space-lg); padding: var(--space-xl) var(--space-md) var(--space-lg);
  text-align: center; border-top: 1px solid var(--border-subtle);
}
.home__footer-name { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: var(--space-xs); }
.home__footer-copy { font-size: 11px; color: var(--text-muted); }
</style>
