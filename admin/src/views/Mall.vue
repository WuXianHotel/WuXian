<template>
  <div>
    <!-- Tabs -->
    <el-card shadow="hover" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:center">
        <el-button :type="tab==='products'?'primary':'default'" @click="tab='products';loadProducts()">商品管理</el-button>
        <el-button :type="tab==='exchanges'?'primary':'default'" @click="tab='exchanges';loadExchanges()">兑换订单</el-button>
        <el-button v-if="tab==='products'" style="margin-left:auto" @click="openCreate">+ 新增商品</el-button>
      </div>
    </el-card>

    <!-- Products Tab -->
    <el-card shadow="hover" v-if="tab==='products'">
      <el-table :data="products" v-loading="loading" stripe style="width:100%">
        <el-table-column prop="name" label="商品名" />
        <el-table-column prop="points_cost" label="积分" width="80" />
        <el-table-column prop="stock" label="库存" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status===1?'success':'danger'" size="small">{{ row.status===1?'上架':'下架' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="doDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Exchanges Tab -->
    <el-card shadow="hover" v-if="tab==='exchanges'">
      <el-table :data="exchanges" v-loading="loadingEx" stripe style="width:100%">
        <el-table-column label="ID" width="60">
          <template #default="{ row }">#{{ row.id }}</template>
        </el-table-column>
        <el-table-column label="用户" width="100">
          <template #default="{ row }">{{ row.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column prop="product_name" label="商品" />
        <el-table-column prop="points_spent" label="积分" width="70" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="exStatusType(row.status)" size="small">{{ exStatusLabel(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="收件信息" min-width="180">
          <template #default="{ row }">{{ `${row.receiver||''} ${row.phone||''} ${row.address||''}`.trim() || '-' }}</template>
        </el-table-column>
        <el-table-column label="时间" width="120">
          <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <template v-if="row.status===0">
              <el-button type="success" link size="small" @click="handleExchange(row,1)">完成</el-button>
              <el-button type="danger" link size="small" @click="handleExchange(row,2)">取消</el-button>
            </template>
            <span v-else style="color:#94a3b8">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Product Dialog -->
    <el-dialog v-model="showModal" :title="editingId ? '编辑商品' : '新增商品'" width="500px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="商品名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="form.image" placeholder="留空使用默认图标" /></el-form-item>
        <el-form-item label="所需积分"><el-input-number v-model="form.pointsCost" :min="1" style="width:100%" /></el-form-item>
        <el-form-item label="库存"><el-input-number v-model="form.stock" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="上架" :value="1" />
            <el-option label="下架" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showModal=false">取消</el-button>
        <el-button type="primary" @click="saveProduct" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { ElMessageBox } from 'element-plus'
import { getMallProducts, createMallProduct, updateMallProduct, deleteMallProduct, getMallExchanges, updateExchange } from '@/api/mall'

const toast = inject('toast')
const tab = ref('products')
const loading = ref(true)
const loadingEx = ref(true)
const products = ref([])
const exchanges = ref([])

const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)
const form = ref({})

const exStatusLabel = (s) => ({ 0: '待处理', 1: '已完成', 2: '已取消' }[s] || s)
const exStatusType = (s) => ({ 0: 'warning', 1: 'success', 2: 'danger' }[s] || 'info')
const fmtDate = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}

async function loadProducts() {
  loading.value = true
  try { const res = await getMallProducts({ page: 1, pageSize: 100 }); products.value = res.data?.list || [] }
  catch { toast?.error('加载失败') }
  loading.value = false
}

async function loadExchanges() {
  loadingEx.value = true
  try { const res = await getMallExchanges({ page: 1, pageSize: 100 }); exchanges.value = res.data?.list || [] }
  catch { toast?.error('加载失败') }
  loadingEx.value = false
}

function openCreate() {
  editingId.value = null
  form.value = { name: '', description: '', image: '', pointsCost: null, stock: 999, status: 1 }
  showModal.value = true
}

function openEdit(p) {
  editingId.value = p.id
  form.value = { name: p.name, description: p.description, image: p.image, pointsCost: p.points_cost, stock: p.stock, status: p.status }
  showModal.value = true
}

async function saveProduct() {
  if (!form.value.name || !form.value.pointsCost) { toast?.error('请填写名称和积分'); return }
  saving.value = true
  try {
    if (editingId.value) {
      await updateMallProduct(editingId.value, form.value)
      toast?.success('更新成功')
    } else {
      await createMallProduct(form.value)
      toast?.success('创建成功')
    }
    showModal.value = false; loadProducts()
  } catch (e) { toast?.error(e?.msg || '操作失败') }
  saving.value = false
}

async function doDelete(p) {
  try {
    await ElMessageBox.confirm(`确定删除「${p.name}」？`, '确认删除', { type: 'warning' })
    await deleteMallProduct(p.id); toast?.success('已删除'); loadProducts()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '删除失败') }
}

async function handleExchange(e, status) {
  const label = status === 1 ? '完成' : '取消'
  try {
    await ElMessageBox.confirm(`确认${label}该兑换订单？`, '确认', { type: 'info' })
    await updateExchange(e.id, { status }); toast?.success(`已${label}`); loadExchanges()
  } catch (err) { if (err !== 'cancel') toast?.error(err?.msg || '操作失败') }
}

onMounted(() => { loadProducts(); loadExchanges() })
</script>
