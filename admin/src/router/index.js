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
      { path: '',        redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '仪表盘' } },
      { path: 'rooms',     component: () => import('@/views/Rooms.vue'),     meta: { title: '房型管理' } },
      { path: 'orders',    component: () => import('@/views/Orders.vue'),    meta: { title: '订单管理' } },
      { path: 'members',   component: () => import('@/views/Members.vue'),   meta: { title: '会员管理' } },
      { path: 'reports',   component: () => import('@/views/Reports.vue'),   meta: { title: '财务报表' } },
      { path: 'system',    component: () => import('@/views/System.vue'),    meta: { title: '系统设置' } },
      { path: 'mall',      component: () => import('@/views/Mall.vue'),      meta: { title: '积分商城' } },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  // 与 vite.config.js base 保持一致
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.token) return '/login'
})

export default router
