<template>
  <div>
    <!-- KPI Cards -->
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6" v-for="k in kpis" :key="k.label">
        <el-card shadow="hover" body-style="display:flex;align-items:center;gap:16px;padding:20px">
          <div class="kpi-icon" :style="{ background: k.color }">
            <el-icon :size="22"><component :is="k.icon" /></el-icon>
          </div>
          <div>
            <div class="kpi-value">{{ k.value }}</div>
            <div class="kpi-label">{{ k.label }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 今日订单 -->
      <el-col :span="17">
        <el-card shadow="hover">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:600">今日订单</span>
              <router-link to="/orders">
                <el-button type="primary" link size="small">查看全部 →</el-button>
              </router-link>
            </div>
          </template>
          <el-table :data="todayOrders" v-loading="loadingOrders" stripe style="width:100%">
            <el-table-column prop="order_no" label="订单号" width="200">
              <template #default="{ row }"><span class="mono">{{ row.order_no }}</span></template>
            </el-table-column>
            <el-table-column prop="room_name" label="房型" />
            <el-table-column prop="check_in_date" label="入住日期" width="160">
              <template #default="{ row }">{{ fmtDate(row.check_in_date) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="100">
              <template #default="{ row }">¥{{ row.pay_amount }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 快速操作 -->
      <el-col :span="7">
        <el-card shadow="hover" style="height:100%">
          <template #header><span style="font-weight:600">快捷操作</span></template>
          <div class="quick-grid">
            <router-link v-for="q in quickItems" :key="q.to" :to="q.to" class="quick-item">
              <el-icon :size="35"><component :is="q.icon" /></el-icon>
              <span style="font-size:14px">{{ q.label }}</span>
            </router-link>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, markRaw } from 'vue'
import { getOrderStats, getOrders } from '@/api/order'
import { getMemberStats } from '@/api/member'
import {
  Document, House, Money, User,
  TrendCharts, Setting, ShoppingCart,
} from '@element-plus/icons-vue'

const stats = ref({})
const memberStats = ref({})
const todayOrders = ref([])
const loadingOrders = ref(true)

onMounted(async () => {
  try {
    const [s, ms, orders] = await Promise.all([
      getOrderStats(),
      getMemberStats(),
      getOrders({ pageSize: 8, page: 1 })
    ])
    stats.value = s.data || {}
    memberStats.value = ms.data || {}
    todayOrders.value = orders.data?.list || []
  } catch {}
  loadingOrders.value = false
})

const kpis = computed(() => [
  { label: '今日订单', value: stats.value.today ?? '--', icon: markRaw(Document), color: '#dbeafe' },
  { label: '当前入住', value: stats.value.checkin ?? '--', icon: markRaw(House), color: '#dcfce7' },
  { label: '总收入（元）', value: stats.value.revenue != null ? `¥${Number(stats.value.revenue).toLocaleString()}` : '--', icon: markRaw(Money), color: '#fef3c7' },
  { label: '会员总数', value: memberStats.value.total ?? '--', icon: markRaw(User), color: '#f3e8ff' },
])

const quickItems = [
  { to: '/rooms',   icon: markRaw(House),         label: '新增房型' },
  { to: '/orders',  icon: markRaw(Document),      label: '订单管理' },
  { to: '/members', icon: markRaw(User),          label: '会员管理' },
  { to: '/mall',    icon: markRaw(ShoppingCart),  label: '积分商城' },
  { to: '/reports', icon: markRaw(TrendCharts),   label: '财务报表' },
  { to: '/system',  icon: markRaw(Setting),       label: '系统设置' },
]

const statusMap = {
  0: ['待支付', 'warning'],
  1: ['待入住', ''],
  2: ['入住中', 'success'],
  3: ['已完成', 'info'],
  4: ['已取消', 'danger'],
  5: ['退款中', 'warning'],
  6: ['已退款', 'info'],
}
const statusLabel = (s) => statusMap[s]?.[0] || s
const statusType = (s) => statusMap[s]?.[1] || 'info'

const fmtDate = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  const Y = dt.getFullYear()
  const M = String(dt.getMonth() + 1).padStart(2, '0')
  const D = String(dt.getDate()).padStart(2, '0')
  const h = String(dt.getHours()).padStart(2, '0')
  const m = String(dt.getMinutes()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}`
}
</script>

<style scoped>
.kpi-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #334155; }
.kpi-value { font-size: 24px; font-weight: 700; color: var(--text); }
.kpi-label { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

.quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick-item {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 16px 10px; border-radius: 8px; background: #f8fafc;
  font-size: 13px; color: var(--text); transition: .15s; text-decoration: none;
  padding: 26px 0;
}
.quick-item:hover { background: var(--primary-bg); color: var(--primary); }
</style>
