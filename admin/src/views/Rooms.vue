<template>
  <div>
    <!-- Filter bar -->
    <el-card shadow="hover" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <el-input v-model="filter.keyword" placeholder="搜索房型名称…" style="width:200px" clearable @keyup.enter="load" />
        <el-select v-model="filter.status" placeholder="全部状态" clearable style="width:120px" @change="load">
          <el-option label="上架" value="1" />
          <el-option label="下架" value="0" />
        </el-select>
        <el-select v-model="filter.bedType" placeholder="全部床型" clearable style="width:120px" @change="load">
          <el-option v-for="bt in bedTypes" :key="bt" :label="bt" :value="bt" />
        </el-select>
        <el-button type="primary" @click="load">搜索</el-button>
        <el-button @click="openCreate">＋ 新增房型</el-button>
      </div>
    </el-card>

    <!-- Card grid -->
    <div v-loading="loading" class="room-grid">
      <el-card v-for="r in rooms" :key="r.id" shadow="hover" body-style="padding:0" class="room-card">
        <div class="room-img" :style="{ background: imgBg(r.id) }">
          <img v-if="firstImage(r)" :src="firstImage(r)" class="room-img-img" />
          <div v-else class="room-img-placeholder">{{ r.name[0] }}</div>
          <el-tag :type="r.status===1?'success':'danger'" size="small" class="status-tag">{{ r.status===1?'上架':'下架' }}</el-tag>
        </div>
        <div class="room-body">
          <div class="room-name">{{ r.name }}</div>
          <div class="room-tags">
            <el-tag size="small" type="info" v-if="r.area">{{ r.area }}㎡</el-tag>
            <el-tag size="small" type="info" v-if="r.bed_type">{{ r.bed_type }}</el-tag>
            <el-tag size="small" type="info" v-if="r.max_guests">最多{{ r.max_guests }}人</el-tag>
            <el-tag size="small" type="info" v-if="r.breakfast">含早</el-tag>
          </div>
          <div class="room-price">
            <span class="price-num">¥{{ r.base_price }}</span>
            <span class="price-unit">/晚</span>
            <span class="room-count">共 {{ r.room_count }} 间</span>
          </div>
          <div style="display:flex;">
            <el-button size="small" @click="openRoomMgr(r)">房间管理</el-button>
            <el-button size="small" @click="openEdit(r)">编辑</el-button>
            <el-button size="small" @click="toggleStatus(r)">{{ r.status===1?'下架':'上架' }}</el-button>
            <el-button size="small" type="danger" plain @click="confirmDelete(r)">删除</el-button>
          </div>
        </div>
      </el-card>
      <el-empty v-if="!loading && !rooms.length" description="暂无房型数据" style="grid-column:1/-1" />
    </div>

    <!-- Pagination -->
    <div style="display:flex;justify-content:flex-end;margin-top:16px" v-if="total > pageSize">
      <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="load" />
    </div>

    <!-- Create / Edit Dialog -->
    <el-dialog v-model="showModal" :title="editing ? '编辑房型' : '新增房型'" width="640px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="房型名称"><el-input v-model="form.name" placeholder="如：豪华大床房" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面积（㎡）"><el-input-number v-model="form.area" :min="0" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="床型">
              <el-select v-model="form.bedType" placeholder="请选择" style="width:100%">
                <el-option v-for="bt in bedTypes" :key="bt" :label="bt" :value="bt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="楼层信息"><el-input v-model="form.floorInfo" placeholder="如：5-10层" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="景观"><el-input v-model="form.view" placeholder="如：城市景观" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最多入住"><el-input-number v-model="form.maxGuests" :min="1" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="基础价格"><el-input-number v-model="form.basePrice" :min="0" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="节假日价格"><el-input-number v-model="form.holidayPrice" :min="0" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="房间总数"><el-input-number v-model="form.totalRooms" :min="1" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序权重"><el-input-number v-model="form.sortOrder" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="选项">
              <el-checkbox v-model="form.smoke">允许吸烟</el-checkbox>
              <el-checkbox v-model="form.breakfast">含早餐</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="房型描述"><el-input v-model="form.description" type="textarea" :rows="3" placeholder="详细描述…" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="房型图片">
              <el-upload
                :file-list="form.imageList"
                list-type="picture-card"
                :auto-upload="false"
                :on-change="onImageChange"
                :on-remove="onImageRemove"
                accept=".jpg,.jpeg,.png,.webp"
                :limit="6"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px">最多 6 张，支持 JPG/PNG/WEBP，上传至腾讯云 COS</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-alert v-if="formErr" :title="formErr" type="error" show-icon :closable="false" style="margin-bottom:16px" />
      <template #footer>
        <el-button @click="showModal=false">取消</el-button>
        <el-button type="primary" @click="saveRoom" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- Room Management Dialog -->
    <el-dialog v-model="showRoomMgr" :title="'房间管理 — ' + (roomMgr?.name || '')" width="700px" destroy-on-close>
      <!-- Add room form -->
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
        <el-input v-model="newRoom.roomNo" placeholder="房间号（如 501）" style="width:120px" />
        <el-input-number v-model="newRoom.floor" placeholder="楼层" :min="1" style="width:100px" />
        <el-input v-model="newRoom.remark" placeholder="备注（选填）" style="flex:1" />
        <el-button type="primary" size="small" @click="doAddRoom">添加</el-button>
      </div>

      <el-table :data="roomList" v-loading="roomListLoading" stripe style="width:100%" max-height="400px">
        <el-table-column prop="room_no" label="房间号" width="100">
          <template #default="{ row }"><span class="mono" style="font-weight:600">{{ row.room_no }}</span></template>
        </el-table-column>
        <el-table-column label="楼层" width="80">
          <template #default="{ row }">{{ row.floor }}F</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-select :model-value="row.status" size="small" @change="(v) => changeRoomStatus(row, v)">
              <el-option v-for="rs in roomStatuses" :key="rs.val" :label="rs.label" :value="rs.val" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注">
          <template #default="{ row }"><span style="color:#94a3b8">{{ row.remark || '-' }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button size="small" type="danger" plain :disabled="row.status===1" @click="doDeleteRoom(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <span style="font-size:13px;color:#94a3b8">
          共 {{ roomList.length }} 间 ·
          空闲 {{ roomList.filter(r=>r.status===0).length }} ·
          入住 {{ roomList.filter(r=>r.status===1).length }} ·
          清洁 {{ roomList.filter(r=>r.status===4).length }} ·
          维修 {{ roomList.filter(r=>r.status===3).length }}
        </span>
        <el-button @click="showRoomMgr=false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getRooms, createRoom, updateRoom, setStatus, deleteRoom, getRoomList, addRoom, setRoomStatus, deleteRoomItem } from '@/api/room'
import { uploadToCos } from '@/api/upload'

const toast   = inject('toast')
const loading = ref(true)
const saving  = ref(false)
const rooms   = ref([])
const total   = ref(0)
const page    = ref(1)
const pageSize = 12
const filter  = ref({ keyword: '', status: '', bedType: '' })
const showModal = ref(false)
const editing   = ref(null)
const formErr   = ref('')
const form      = ref({})
const bedTypes  = ['大床', '双床', '单床', '亲子床', '圆床']

const colors = ['#dbeafe','#dcfce7','#fef3c7','#fce7f3','#f3e8ff','#ffedd5']
const imgBg = (id) => colors[id % colors.length]
const firstImage = (r) => {
  try { const imgs = typeof r.images === 'string' ? JSON.parse(r.images) : r.images; return imgs?.[0] || null }
  catch { return null }
}

async function load() {
  loading.value = true
  try {
    const res = await getRooms({ page: page.value, pageSize, ...filter.value })
    rooms.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { toast?.error('加载失败') }
  loading.value = false
}

onMounted(load)

function openCreate() {
  editing.value = null
  form.value = { name:'', area:null, bedType:'', floorInfo:'', view:'', maxGuests:2,
                 smoke:false, breakfast:false, basePrice:null, holidayPrice:null,
                 totalRooms:null, sortOrder:0, description:'', imageList:[] }
  formErr.value = ''
  showModal.value = true
}
function openEdit(r) {
  editing.value = r
  // 解析已有图片
  let existingImages = []
  try {
    const imgs = typeof r.images === 'string' ? JSON.parse(r.images) : r.images
    if (Array.isArray(imgs)) {
      existingImages = imgs.map((url, i) => ({ name: `image_${i}`, url, status: 'success', cosUrl: url }))
    }
  } catch {}
  form.value = { name:r.name, area:r.area, bedType:r.bed_type, floorInfo:r.floor_info,
                 view:r.view, maxGuests:r.max_guests, smoke:!!r.smoke, breakfast:!!r.breakfast,
                 basePrice:r.base_price, holidayPrice:r.holiday_price, totalRooms:r.total_rooms,
                 sortOrder:r.sort_order, description:r.description, imageList: existingImages }
  formErr.value = ''
  showModal.value = true
}

// 图片上传处理
function onImageChange(file, fileList) {
  form.value.imageList = fileList
}
function onImageRemove(file, fileList) {
  form.value.imageList = fileList
}

async function saveRoom() {
  if (!form.value.name) { formErr.value = '请填写房型名称'; return }
  if (!form.value.basePrice) { formErr.value = '请填写基础价格'; return }
  if (!form.value.totalRooms) { formErr.value = '请填写房间总数'; return }
  formErr.value = ''
  saving.value = true
  try {
    // 上传新图片到 COS
    const imageUrls = []
    for (const item of (form.value.imageList || [])) {
      if (item.cosUrl) {
        // 已有的 COS URL，保存前剥离签名参数（只存干净的 URL，避免存入过期签名）
        imageUrls.push(String(item.cosUrl).split('?')[0])
      } else if (item.raw) {
        // 新选择的文件，上传到 COS
        const url = await uploadToCos(item.raw, 'room-images/')
        imageUrls.push(String(url).split('?')[0])
      }
    }

    const payload = { ...form.value, images: JSON.stringify(imageUrls) }
    delete payload.imageList

    if (editing.value) {
      await updateRoom(editing.value.id, payload)
      toast?.success('更新成功')
    } else {
      await createRoom(payload)
      toast?.success('新增成功')
    }
    showModal.value = false
    load()
  } catch (e) { formErr.value = e?.msg || e?.message || '操作失败' }
  saving.value = false
}

async function toggleStatus(r) {
  try {
    await setStatus(r.id, r.status === 1 ? 0 : 1)
    toast?.success(r.status === 1 ? '已下架' : '已上架')
    load()
  } catch (e) { toast?.error(e?.msg || '操作失败') }
}

async function confirmDelete(r) {
  try {
    await ElMessageBox.confirm(`确定删除房型「${r.name}」吗？此操作不可撤销。`, '确认删除', { type: 'warning' })
    await deleteRoom(r.id)
    toast?.success('删除成功')
    load()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '删除失败') }
}

// ── 房间管理 ────────────────────────────────────────────────────────────────
const roomMgr = ref(null)
const showRoomMgr = ref(false)
const roomList = ref([])
const roomListLoading = ref(false)
const newRoom = ref({ roomNo: '', floor: null, remark: '' })

const roomStatuses = [
  { val: 0, label: '空闲' },
  { val: 1, label: '入住中' },
  { val: 2, label: '已预订' },
  { val: 3, label: '维修' },
  { val: 4, label: '清洁' },
]

async function openRoomMgr(r) {
  roomMgr.value = r
  showRoomMgr.value = true
  newRoom.value = { roomNo: '', floor: null, remark: '' }
  await loadRoomList()
}

async function loadRoomList() {
  roomListLoading.value = true
  try {
    const res = await getRoomList(roomMgr.value.id)
    roomList.value = res.data || []
  } catch { toast?.error('加载房间列表失败') }
  roomListLoading.value = false
}

async function doAddRoom() {
  if (!newRoom.value.roomNo) { toast?.error('请填写房间号'); return }
  if (!newRoom.value.floor || newRoom.value.floor < 1) { toast?.error('请填写楼层'); return }
  try {
    await addRoom(roomMgr.value.id, newRoom.value)
    toast?.success('房间添加成功')
    newRoom.value = { roomNo: '', floor: null, remark: '' }
    loadRoomList()
    load()
  } catch (e) { toast?.error(e?.msg || '添加失败') }
}

async function changeRoomStatus(rm, newStatus) {
  try {
    await setRoomStatus(roomMgr.value.id, rm.id, newStatus)
    rm.status = newStatus
    toast?.success('状态已更新')
  } catch (e) {
    toast?.error(e?.msg || '操作失败')
    loadRoomList()
  }
}

async function doDeleteRoom(rm) {
  try {
    await ElMessageBox.confirm(`确定删除房间「${rm.room_no}」吗？`, '确认删除', { type: 'warning' })
    await deleteRoomItem(roomMgr.value.id, rm.id)
    toast?.success('房间已删除')
    loadRoomList()
    load()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '删除失败') }
}
</script>

<style scoped>
.room-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;
}
.room-card { overflow: hidden; }
.room-img { position: relative; height: 160px; display: flex; align-items: center; justify-content: center; }
.room-img-img { width: 100%; height: 100%; object-fit: cover; }
.room-img-placeholder { font-size: 48px; opacity: .4; }
.status-tag { position: absolute; top: 10px; right: 10px; }
.room-body { padding: 14px 16px; }
.room-name { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
.room-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.room-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 12px; }
.price-num { font-size: 20px; font-weight: 700; color: var(--primary); }
.price-unit { font-size: 12px; color: var(--text-secondary); }
.room-count { margin-left: auto; font-size: 12px; color: var(--text-muted); }
</style>
