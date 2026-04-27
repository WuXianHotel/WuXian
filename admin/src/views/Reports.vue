<template>
  <div>
    <!-- Date range -->
    <el-card shadow="hover" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span style="color:var(--text-secondary);font-size:13px">统计周期：</span>
        <el-date-picker v-model="range.start" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" :disabled-date="(d) => d > new Date()" style="width:150px" />
        <span style="color:#94a3b8">—</span>
        <el-date-picker v-model="range.end" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" :disabled-date="(d) => d > new Date()" style="width:150px" />
        <el-button type="primary" @click="loadAll">查询</el-button>
        <el-button @click="exportData">导出 CSV</el-button>
      </div>
    </el-card>

    <!-- KPI -->
    <el-row :gutter="14" style="margin-bottom:16px">
      <el-col :span="6" v-for="k in kpis" :key="k.label">
        <el-card shadow="hover" body-style="display:flex;align-items:center;gap:14px;padding:20px">
          <div class="kpi-icon" :style="{background:k.color}">
            <el-icon :size="20"><component :is="k.icon" /></el-icon>
          </div>
          <div>
            <div class="kpi-value">{{ k.value }}</div>
            <div class="kpi-label">{{ k.label }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- Daily trend -->
      <el-col :span="18">
        <el-card shadow="hover">
          <template #header><span style="font-weight:600">收入趋势（近30天）</span></template>
          <div v-loading="loadingDaily" class="chart-wrap">
            <canvas ref="lineChartRef"></canvas>
          </div>
        </el-card>
      </el-col>

      <!-- Room type revenue -->
      <el-col :span="6">
        <el-card shadow="hover" style="height:100%">
          <template #header><span style="font-weight:600">各房型收入</span></template>
          <div v-loading="loadingRoomTypes">
            <canvas ref="pieChartRef" style="max-height:220px"></canvas>
            <el-empty v-if="!roomTypeData.length" description="暂无数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, inject, onBeforeUnmount, markRaw } from 'vue'
import { getOverview, getDaily, getRoomTypes, exportCsv } from '@/api/report'
import { Chart, registerables } from 'chart.js'
import { Money, Document, OfficeBuilding, DataAnalysis } from '@element-plus/icons-vue'

Chart.register(...registerables)

const toast = inject('toast')
const loadingDaily = ref(true)
const loadingRoomTypes = ref(true)
const overview = ref({})
const dailyData = ref([])
const roomTypeData = ref([])

const lineChartRef = ref(null)
const pieChartRef = ref(null)
let lineChart = null
let pieChart = null

function toLocalDate(dt) {
  const Y = dt.getFullYear()
  const M = String(dt.getMonth() + 1).padStart(2, '0')
  const D = String(dt.getDate()).padStart(2, '0')
  return `${Y}-${M}-${D}`
}

const today = new Date()
const range = ref({
  start: toLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  end:   toLocalDate(today)
})

const kpis = computed(() => {
  const ov = overview.value
  const monthAmount = ov.thisMonth?.amount
  const monthOrders = ov.thisMonth?.orders
  const avgPrice = (monthOrders && monthOrders > 0) ? Math.round(monthAmount / monthOrders) : null
  return [
    { label: '本月收入', value: monthAmount != null ? `¥${Number(monthAmount).toLocaleString()}` : '--', icon: markRaw(Money), color: '#dbeafe' },
    { label: '本月订单', value: monthOrders ?? '--', icon: markRaw(Document), color: '#dcfce7' },
    { label: '入住率', value: ov.occupancyRate != null ? `${ov.occupancyRate}%` : '--', icon: markRaw(OfficeBuilding), color: '#fef3c7' },
    { label: '客单价', value: avgPrice != null ? `¥${avgPrice}` : '--', icon: markRaw(DataAnalysis), color: '#f3e8ff' },
  ]
})

const dailyFull = computed(() => {
  const map = Object.fromEntries(dailyData.value.map(d => [d.date, d]))
  const days = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(now)
    dt.setDate(dt.getDate() - i)
    const key = toLocalDate(dt)
    days.push(map[key] || { date: key, amount: 0, orders: 0 })
  }
  return days
})

function renderLineChart() {
  if (!lineChartRef.value) return
  if (lineChart) lineChart.destroy()
  const data = dailyFull.value
  lineChart = new Chart(lineChartRef.value, {
    type: 'line',
    data: {
      labels: data.map(d => d.date.slice(5)),
      datasets: [{ label: '收入（元）', data: data.map(d => Number(d.amount) || 0), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0.35, borderWidth: 2, pointRadius: 2, pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderColor: '#3b82f6', pointBorderWidth: 2 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleFont: { size: 12 }, bodyFont: { size: 13 }, padding: 10, cornerRadius: 6, callbacks: { title: (items) => data[items[0].dataIndex]?.date || '', label: (item) => ` ¥${Number(item.raw).toLocaleString()}` } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8', callback: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v } } },
    },
  })
}

const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

function renderPieChart() {
  if (!pieChartRef.value) return
  if (pieChart) pieChart.destroy()
  const data = roomTypeData.value
  if (!data.length) return
  pieChart = new Chart(pieChartRef.value, {
    type: 'doughnut',
    data: { labels: data.map(d => d.name), datasets: [{ data: data.map(d => Number(d.amount) || 0), backgroundColor: data.map((_, i) => pieColors[i % pieColors.length]), borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8 } }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 6, callbacks: { label: (item) => ` ${item.label}: ¥${Number(item.raw).toLocaleString()}` } } } },
  })
}

async function loadAll() {
  loadingDaily.value = true
  loadingRoomTypes.value = true
  const now = new Date()
  const d30 = new Date(now); d30.setDate(d30.getDate() - 29)
  const dailyStart = toLocalDate(d30)
  const dailyEnd   = toLocalDate(now)
  try {
    const [ov, daily, rt] = await Promise.all([
      getOverview(range.value),
      getDaily({ start: dailyStart, end: dailyEnd }),
      getRoomTypes({ startDate: range.value.start, endDate: range.value.end }),
    ])
    overview.value    = ov.data || {}
    dailyData.value   = daily.data || []
    roomTypeData.value = rt.data || []
  } catch {}
  loadingDaily.value = false
  loadingRoomTypes.value = false
  await nextTick()
  renderLineChart()
  renderPieChart()
}

async function exportData() {
  try {
    const blob = await exportCsv({ startDate: range.value.start, endDate: range.value.end })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `report_${range.value.start}_${range.value.end}.csv`; a.click(); URL.revokeObjectURL(url)
    toast?.success('导出成功')
  } catch { toast?.error('导出失败') }
}

onMounted(loadAll)
onBeforeUnmount(() => { if (lineChart) lineChart.destroy(); if (pieChart) pieChart.destroy() })
</script>

<style scoped>
.kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.kpi-value { font-size: 22px; font-weight: 700; }
.kpi-label { font-size: 12px; color: var(--text-secondary); }
.chart-wrap { position: relative; height: 260px; }
</style>
