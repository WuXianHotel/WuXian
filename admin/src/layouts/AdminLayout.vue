<template>
  <el-container class="admin-layout">
    <!-- Sidebar -->
    <el-aside width="220px" class="sidebar">
      <div class="sidebar-logo">
        <el-icon :size="24"><OfficeBuilding /></el-icon>
        <span class="logo-text">柳州无限电竞酒店</span>
      </div>

      <el-menu
        :default-active="route.path"
        router
        background-color="#0f172a"
        text-color="rgba(255,255,255,.7)"
        active-text-color="#fff"
        class="sidebar-menu"
      >
        <el-menu-item v-for="item in navItems" :key="item.to" :index="item.to">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-user">
        <div class="user-info">
          <el-avatar :size="34" style="background:var(--primary)">{{ userInitial }}</el-avatar>
          <div>
            <div class="user-name">{{ auth.user?.username || '管理员' }}</div>
            <div class="user-role">{{ roleLabel }}</div>
          </div>
        </div>
        <el-button text circle @click="doLogout" title="退出登录" style="color:rgba(255,255,255,.5)">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </el-aside>

    <!-- Main -->
    <el-container direction="vertical">
      <el-header class="topbar" height="56px">
        <div class="topbar-title">{{ currentTitle }}</div>
        <div class="topbar-date">{{ today }}</div>
      </el-header>

      <el-main class="page-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, provide, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import {
  SwitchButton, OfficeBuilding, DataAnalysis, House,
  Document, User, ShoppingCart, DataLine, Setting, Picture, Key
} from '@element-plus/icons-vue'

const auth   = useAuthStore()
const route  = useRoute()
const router = useRouter()

onMounted(() => { if (!auth.user) auth.fetchMe() })

// 菜单配置：permission 字段用于权限过滤
const allNavItems = [
  { to: '/dashboard', icon: markRaw(DataAnalysis),  label: '仪表盘',     permission: 'dashboard:view' },
  { to: '/rooms',     icon: markRaw(House),          label: '房型管理',   permission: 'rooms:view' },
  { to: '/orders',    icon: markRaw(Document),       label: '订单管理',   permission: 'orders:view' },
  { to: '/members',   icon: markRaw(User),           label: '会员管理',   permission: 'members:view' },
  { to: '/mall',      icon: markRaw(ShoppingCart),   label: '积分商城',   permission: 'mall:view' },
  { to: '/banners',   icon: markRaw(Picture),        label: 'Banner管理', permission: 'banners:view' },
  { to: '/reports',   icon: markRaw(DataLine),       label: '财务报表',   permission: 'reports:view' },
  { to: '/system',    icon: markRaw(Setting),        label: '系统设置',   permission: 'system:settings' },
  { to: '/roles',     icon: markRaw(Key),            label: '角色权限',   permission: 'roles:manage' },
];

// 根据权限动态过滤菜单
const navItems = computed(() =>
  allNavItems.filter(item => !item.permission || auth.hasPermission(item.permission))
);

const roleMap = { super: '超级管理员', front_desk: '前台', finance: '财务', operation: '运营' }
const roleLabel = computed(() => roleMap[auth.user?.role] || auth.user?.role || '')
const userInitial = computed(() => (auth.user?.username || 'A')[0].toUpperCase())
const currentTitle = computed(() => {
  const matched = allNavItems.find(n => route.path.startsWith(n.to))
  return matched?.label || '管理后台'
})
const today = computed(() => new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }))

function doLogout() {
  auth.logout()
  router.push('/login')
}

// 全局 toast 使用 ElMessage
provide('toast', {
  success: (m) => ElMessage.success(m),
  error: (m) => ElMessage.error(m),
  info: (m) => ElMessage.info(m),
})
</script>

<style scoped>
.admin-layout { height: 100vh; overflow: hidden; }

/* Sidebar */
.sidebar {
  background: var(--sidebar-bg); color: #fff;
  display: flex; flex-direction: column; overflow: hidden;
}
.sidebar-logo {
  padding: 20px 20px 16px;
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.logo-text { font-size: 16px; font-weight: 700; letter-spacing: .5px; }

.sidebar-menu {
  flex: 1; border-right: none; overflow-y: auto;
}
.sidebar-menu .el-menu-item {
  height: 44px; line-height: 44px; margin: 2px 10px; border-radius: 7px;
}
.sidebar-menu .el-menu-item.is-active {
  background: var(--primary) !important;
}
.sidebar-menu .el-menu-item:hover {
  background: var(--sidebar-hover) !important;
}

.sidebar-user {
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,.08);
  display: flex; align-items: center; justify-content: space-between;
}
.user-info { display: flex; align-items: center; gap: 10px; }
.user-name { font-size: 13px; font-weight: 600; }
.user-role { font-size: 11px; color: rgba(255,255,255,.5); }

/* Main */
.topbar {
  background: #fff; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
}
.topbar-title { font-size: 16px; font-weight: 600; }
.topbar-date { font-size: 13px; color: var(--text-secondary); }
.page-content { background: var(--bg); overflow-y: auto; }
</style>
