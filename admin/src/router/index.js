import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      { path: '',         redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('@/views/Dashboard.vue'),  meta: { title: '仪表盘',     permission: 'dashboard:view' } },
      { path: 'rooms',     component: () => import('@/views/Rooms.vue'),      meta: { title: '房型管理',   permission: 'rooms:view' } },
      { path: 'orders',    component: () => import('@/views/Orders.vue'),     meta: { title: '订单管理',   permission: 'orders:view' } },
      { path: 'members',   component: () => import('@/views/Members.vue'),    meta: { title: '会员管理',   permission: 'members:view' } },
      { path: 'reports',   component: () => import('@/views/Reports.vue'),    meta: { title: '财务报表',   permission: 'reports:view' } },
      { path: 'system',    component: () => import('@/views/System.vue'),     meta: { title: '系统设置',   permission: 'system:settings' } },
      { path: 'mall',      component: () => import('@/views/Mall.vue'),       meta: { title: '积分商城',   permission: 'mall:view' } },
      { path: 'banners',   component: () => import('@/views/Banners.vue'),    meta: { title: 'Banner管理', permission: 'banners:view' } },
      { path: 'roles',     component: () => import('@/views/RoleManagement.vue'), meta: { title: '角色权限', permission: 'roles:manage' } },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  // 与 vite.config.js base 保持一致
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // 公开页面不校验
  if (to.meta.public) return;

  // 未登录跳转登录页
  if (!auth.token) return '/login';

  // 确保用户信息和权限已加载
  if (!auth.user) {
    await auth.fetchMe();
  }

  // 权限校验：路由定义了 permission 元信息则检查
  if (to.meta.permission && !auth.hasPermission(to.meta.permission)) {
    // 无权限则返回仪表盘
    return '/dashboard';
  }
})

export default router
