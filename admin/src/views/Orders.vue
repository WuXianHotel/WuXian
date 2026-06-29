<template>
  <div>
    <!-- Status stats -->
    <el-row :gutter="12" style="margin-bottom:16px">
      <el-col :span="3" v-for="s in statusStats" :key="s.key">
        <div :class="['stat-item', { active: filter.status === s.key }]" @click="filter.status = s.key; page=1; load()">
          <div class="stat-num">{{ s.count }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- Filter -->
    <el-card shadow="hover" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <el-input v-model="filter.orderNo" placeholder="订单号" style="width:180px" clearable @keyup.enter="page=1;load()" />
        <el-input v-model="filter.phone" placeholder="用户手机号" style="width:150px" clearable @keyup.enter="page=1;load()" />
        <el-date-picker v-model="filter.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:280px" />
        <el-button type="primary" @click="page=1;load()">搜索</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </el-card>

    <!-- Table -->
    <el-card shadow="hover">
      <el-table :data="orders" v-loading="loading" stripe style="width:100%">
        <el-table-column prop="order_no" label="订单号">
          <template #default="{ row }"><span class="mono">{{ row.order_no }}</span></template>
        </el-table-column>
        <el-table-column prop="room_name" label="房型" />
        <el-table-column label="入住日期">
          <template #default="{ row }">{{ fmtDate(row.check_in_date) }}</template>
        </el-table-column>
        <el-table-column label="退房日期">
          <template #default="{ row }">{{ fmtDate(row.check_out_date) }}</template>
        </el-table-column>
        <el-table-column label="入住人">
          <template #default="{ row }">{{ row.guest_display || row.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column label="金额">
          <template #default="{ row }">¥{{ row.pay_amount }}</template>
        </el-table-column>
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间">
          <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button v-if="row.status===1" type="success" link size="small" @click="doCheckin(row)">入住</el-button>
            <el-button v-if="row.status===2" type="primary" link size="small" @click="doCheckout(row)">退房</el-button>
            <el-button v-if="row.status===5" type="warning" link size="small" @click="openRefund(row)">退款审核</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display:flex;justify-content:flex-end;margin-top:16px" v-if="total > pageSize">
        <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="load" />
      </div>
    </el-card>

    <!-- Detail Dialog -->
    <el-dialog v-model="showDetail" title="订单详情" width="600px" destroy-on-close>
      <el-descriptions :column="2" border v-if="detailOrder">
        <el-descriptions-item label="订单号"><span class="mono">{{ detailOrder.order_no }}</span></el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="statusType(detailOrder.status)" size="small">{{ statusLabel(detailOrder.status) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="房型">{{ detailOrder.room_name }}</el-descriptions-item>
        <el-descriptions-item label="房间数">{{ detailOrder.room_count }}</el-descriptions-item>
        <el-descriptions-item label="入住人" :span="2">
          <div v-for="(g, i) in parseGuests(detailOrder)" :key="i">{{ g.name }} · {{ g.phone }}</div>
          <span v-if="!parseGuests(detailOrder).length" style="color:#94a3b8">无入住人信息</span>
        </el-descriptions-item>
        <el-descriptions-item label="下单用户">{{ detailOrder.nickname || '-' }} / {{ detailOrder.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="入住日期">{{ fmtDate(detailOrder.check_in_date) }}</el-descriptions-item>
        <el-descriptions-item label="退房日期">{{ fmtDate(detailOrder.check_out_date) }}</el-descriptions-item>
        <el-descriptions-item label="晚数">{{ detailOrder.nights }}晚</el-descriptions-item>
        <el-descriptions-item label="房间号">{{ detailOrder.room_no || '未分配' }}</el-descriptions-item>
        <el-descriptions-item label="会员优惠">¥{{ detailOrder.member_discount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="实付金额"><span style="color:var(--primary);font-weight:700">¥{{ detailOrder.pay_amount }}</span></el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ fmtDate(detailOrder.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailOrder.special_request || '无' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer><el-button @click="showDetail=false">关闭</el-button></template>
    </el-dialog>

    <!-- Refund Dialog -->
    <el-dialog v-model="showRefund" title="退款审核" width="500px" destroy-on-close>
      <p style="color:#64748b;margin-bottom:16px">订单 {{ refundOrder?.order_no }} — 申请退款 ¥{{ refundOrder?.pay_amount }}</p>
      <el-alert type="info" :closable="false" show-icon style="margin-bottom:16px">
        <template #title>线下退款提示</template>
        审核通过后，请通过线下方式（银行转账、现金等）完成退款，系统仅记录退款状态。
      </el-alert>
      <el-form label-width="80px">
        <el-form-item label="审核结果">
          <el-select v-model="refundResult" style="width:100%">
            <el-option label="批准退款" value="approve" />
            <el-option label="拒绝退款" value="reject" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="refundRemark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRefund=false">取消</el-button>
        <el-button type="primary" @click="submitRefund">确认</el-button>
      </template>
    </el-dialog>

    <!-- Checkin Dialog -->
    <el-dialog v-model="showCheckin" title="办理入住" width="500px" destroy-on-close>
      <p style="color:#64748b;margin-bottom:16px">订单 {{ checkinOrder?.order_no }} — {{ checkinOrder?.room_name }}</p>
      <el-form label-width="80px">
        <el-form-item label="分配房间" required>
          <el-select v-model="checkinRoomId" placeholder="请选择房间" style="width:100%" v-loading="roomsLoading">
            <el-option v-for="r in availableRooms" :key="r.id" :value="r.id" :label="`${r.room_no}（${r.floor}层）`" />
          </el-select>
          <div v-if="!availableRooms.length && !roomsLoading" style="color:#94a3b8;font-size:13px;margin-top:6px">该房型下暂无可用房间</div>
        </el-form-item>
        <el-form-item label="押金">
          <el-input-number v-model="checkinDeposit" :min="0" placeholder="如需收取押金请输入金额" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCheckin=false">取消</el-button>
        <el-button type="primary" :disabled="!checkinRoomId" @click="submitCheckin">确认入住</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { ElMessageBox } from 'element-plus'
import { getOrderStats, getOrders, getOrder, checkin, checkout, auditRefund } from '@/api/order'
import { getRoomList } from '@/api/room'

const toast   = inject('toast')
const loading = ref(true)
const orders  = ref([])
const total   = ref(0)
const page    = ref(1)
const pageSize = 15
const rawStats  = ref({})
const filter    = ref({ orderNo: '', phone: '', status: '', dateRange: null })
const detailOrder = ref(null)
const showDetail = ref(false)
const refundOrder = ref(null)
const showRefund = ref(false)
const refundResult = ref('approve')
const refundRemark = ref('')
const checkinOrder  = ref(null)
const showCheckin = ref(false)
const checkinRoomId = ref('')
const checkinDeposit = ref(null)
const availableRooms = ref([])
const roomsLoading   = ref(false)

const statusConfig = [
  { key: '', label: '全部', countKey: 'total', type: '' },
  { key: '0', label: '待支付', countKey: 'pending_pay', type: 'warning' },
  { key: '1', label: '待入住', countKey: 'pending_checkin', type: '' },
  { key: '2', label: '入住中', countKey: 'checking_in', type: 'success' },
  { key: '3', label: '已完成', countKey: 'checked_out', type: 'info' },
  { key: '4', label: '已取消', countKey: 'cancelled', type: 'danger' },
  { key: '5', label: '退款中', countKey: 'refunding', type: 'warning' },
  { key: '6', label: '已退款', countKey: 'refunded', type: 'info' },
]

const statusStats = computed(() =>
  statusConfig.map(s => ({ ...s, count: rawStats.value[s.countKey] ?? 0 }))
)

const statusLabel = (s) => statusConfig.find(c => c.key === String(s))?.label || s
const statusType = (s) => statusConfig.find(c => c.key === String(s))?.type || 'info'
const fmtDate = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  const Y = dt.getFullYear()
  const M = String(dt.getMonth() + 1).padStart(2, '0')
  const D = String(dt.getDate()).padStart(2, '0')
  const h = String(dt.getHours()).padStart(2, '0')
  const m = String(dt.getMinutes()).padStart(2, '0')
  const s = String(dt.getSeconds()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

function parseGuests(o) {
  if (!o) return []
  let guests = o.guests_info
  if (typeof guests === 'string') {
    try { guests = JSON.parse(guests) } catch { guests = [] }
  }
  return Array.isArray(guests) ? guests : []
}

async function load() {
  loading.value = true
  try {
    const f = filter.value
    const params = { page: page.value, pageSize }
    if (f.status)    params.status    = f.status
    if (f.orderNo)   params.orderNo   = f.orderNo
    if (f.phone)     params.phone     = f.phone
    if (f.dateRange && f.dateRange.length === 2) {
      params.startDate = f.dateRange[0]
      params.endDate   = f.dateRange[1]
    }
    const res = await getOrders(params)
    orders.value = res.data?.list || []
    total.value  = res.data?.total || 0
  } catch { toast?.error('加载失败') }
  loading.value = false
}

async function loadStats() {
  try { const s = await getOrderStats(); rawStats.value = s.data || {} } catch {}
}

// 操作后同时刷新列表和顶部统计
async function refreshAll() {
  await Promise.all([load(), loadStats()])
}

onMounted(() => {
  refreshAll()
})

function resetFilter() { filter.value = { orderNo:'', phone:'', status:'', dateRange: null }; page.value=1; load() }

async function viewDetail(o) {
  try { const res = await getOrder(o.order_no); detailOrder.value = res.data }
  catch { detailOrder.value = o }
  showDetail.value = true
}

async function doCheckin(o) {
  checkinOrder.value = o
  showCheckin.value = true
  checkinRoomId.value = ''
  checkinDeposit.value = null
  availableRooms.value = []
  roomsLoading.value = true
  try {
    const detail = await getOrder(o.order_no)
    const roomTypeId = detail.data?.room_type_id
    if (roomTypeId) {
      const res = await getRoomList(roomTypeId)
      availableRooms.value = (res.data || []).filter(r => r.status === 0)
    }
  } catch { toast?.error('获取房间列表失败') }
  roomsLoading.value = false
}

async function submitCheckin() {
  if (!checkinRoomId.value) return
  try {
    const body = { roomId: Number(checkinRoomId.value) }
    if (checkinDeposit.value) body.deposit = Number(checkinDeposit.value)
    await checkin(checkinOrder.value.order_no, body)
    toast?.success('入住办理成功')
    showCheckin.value = false
    refreshAll()
  } catch (e) { toast?.error(e?.msg || '入住办理失败') }
}

async function doCheckout(o) {
  try {
    await ElMessageBox.confirm(`确认为订单 ${o.order_no} 办理退房？`, '确认退房', { type: 'info' })
    await checkout(o.order_no); toast?.success('退房成功'); refreshAll()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '操作失败') }
}

function openRefund(o) { refundOrder.value = o; showRefund.value = true; refundResult.value = 'approve'; refundRemark.value = '' }

async function submitRefund() {
  try {
    await auditRefund(refundOrder.value.order_no, { action: refundResult.value, remark: refundRemark.value })
    toast?.success(refundResult.value === 'approve' ? '退款审核通过，请线下处理退款' : '退款已拒绝')
    showRefund.value = false; refreshAll()
  } catch (e) { toast?.error(e?.msg || '操作失败') }
}
</script>

<style scoped>
.stat-item {
  background: #fff; border-radius: 8px; padding: 14px;
  text-align: center; cursor: pointer; border: 2px solid transparent;
  box-shadow: 0 1px 3px rgba(0,0,0,.08); transition: .15s;
}
.stat-item:hover { border-color: var(--primary); }
.stat-item.active { border-color: var(--primary); background: var(--primary-bg); }
.stat-num { font-size: 22px; font-weight: 700; color: var(--text); }
.stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
</style>
