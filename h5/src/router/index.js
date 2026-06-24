// 路由配置 —— 与 miniprogram/app.json 页面一一对应
import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '../utils/auth.js';

function isAuditMode() {
  // 检查 URL 参数或 localStorage（initAuditMode 缓存）
  if (window.location.search.indexOf('audit=1') >= 0) return true;
  if (localStorage.getItem('hotel_h5_audit') === '1') return true;
  return false;
}

function requireAuth(to, _from, next) {
  // 审核模式：跳过登录，直接放行
  if (isAuditMode()) {
    console.log('[router] 审核模式，跳过鉴权');
    next();
    return;
  }

  const token = getToken();
  console.log('[router] requireAuth to=' + to.path + ', token=' + (token ? '有(len=' + token.length + ')' : '无'));
  if (!token) {
    // 无 token：尝试通知小程序重新登录
    if (typeof wx !== 'undefined' && wx.miniProgram) {
      console.log('[router] 通知小程序重新登录');
      wx.miniProgram.postMessage({ data: { action: 'reAuth' } });
      setTimeout(() => next('/auth-fail'), 500);
      return;
    }
    console.log('[router] 跳转 auth-fail');
    next('/auth-fail');
    return;
  }
  next();
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { tabIndex: 0, title: '首页' },
  },
  {
    path: '/rooms',
    name: 'rooms',
    component: () => import('../views/Rooms.vue'),
    meta: { tabIndex: 1, title: '探索' },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('../views/Orders.vue'),
    beforeEnter: requireAuth,
    meta: { tabIndex: 2, title: '订单' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/Profile.vue'),
    beforeEnter: requireAuth,
    meta: { tabIndex: 3, title: '我的' },
  },
  // ── 非 tab 页 ──
  {
    path: '/room/:id',
    name: 'roomDetail',
    component: () => import('../views/RoomDetail.vue'),
    meta: { title: '房型详情' },
  },
  {
    path: '/order/create',
    name: 'orderCreate',
    component: () => import('../views/OrderCreate.vue'),
    beforeEnter: requireAuth,
    meta: { title: '填写订单' },
  },
  {
    path: '/order/confirm/:id',
    name: 'orderConfirm',
    component: () => import('../views/OrderConfirm.vue'),
    beforeEnter: requireAuth,
    meta: { title: '确认订单' },
  },
  {
    path: '/order/:id',
    name: 'orderDetail',
    component: () => import('../views/OrderDetail.vue'),
    beforeEnter: requireAuth,
    meta: { title: '订单详情' },
  },
  {
    path: '/member',
    name: 'member',
    component: () => import('../views/Member.vue'),
    beforeEnter: requireAuth,
    meta: { title: '会员中心' },
  },
  {
    path: '/member/level',
    name: 'memberLevel',
    component: () => import('../views/MemberLevel.vue'),
    beforeEnter: requireAuth,
    meta: { title: '会员等级' },
  },
  {
    path: '/profile/edit',
    name: 'profileEdit',
    component: () => import('../views/ProfileEdit.vue'),
    beforeEnter: requireAuth,
    meta: { title: '编辑资料' },
  },
  {
    path: '/wallet',
    name: 'wallet',
    component: () => import('../views/Wallet.vue'),
    beforeEnter: requireAuth,
    meta: { title: '我的钱包' },
  },
  {
    path: '/mall',
    name: 'pointsMall',
    component: () => import('../views/PointsMall.vue'),
    beforeEnter: requireAuth,
    meta: { title: '积分商城' },
  },
  {
    path: '/auth-fail',
    name: 'authFail',
    component: () => import('../views/AuthFail.vue'),
    meta: { title: '需要登录' },
  },
  {
    path: '/banned',
    name: 'banned',
    component: () => import('../views/BanPage.vue'),
    meta: { title: '账号已封禁' },
  },
  {
    path: '/onboard',
    name: 'onboard',
    component: () => import('../views/Onboard.vue'),
    meta: { title: '完善信息' },
  },
];

const router = createRouter({
  history: createWebHistory('/h5/'),
  routes,
});

export default router;
