<template>
  <div style="display:flex;gap:16px;align-items:flex-start">
    <!-- Left nav -->
    <el-card shadow="hover" style="width:180px;flex-shrink:0">
      <el-menu :default-active="activeTab" @select="(key) => activeTab = key">
        <el-menu-item v-for="tab in tabs" :key="tab.key" :index="tab.key">
          <el-icon><component :is="tab.icon" /></el-icon>
          <span>{{ tab.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-card>

    <!-- Content -->
    <div style="flex:1">
      <!-- Hotel settings -->
      <el-card v-if="activeTab === 'hotel'" shadow="hover">
        <template #header><span style="font-weight:600">酒店基本信息</span></template>
        <el-form :model="settings" label-width="100px" v-loading="loadingSettings">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="酒店名称"><el-input v-model="settings.hotel_name" /></el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话"><el-input v-model="settings.hotel_phone" /></el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="入住时间">
                <el-time-picker v-model="settings.check_in_time" format="HH:mm" value-format="HH:mm" placeholder="14:00" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="退房时间">
                <el-time-picker v-model="settings.check_out_time" format="HH:mm" value-format="HH:mm" placeholder="12:00" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="酒店地址"><el-input v-model="settings.hotel_address" /></el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="经度">
                <el-input-number v-model="settings.hotel_latitude" :precision="6" :step="0.001" style="width:100%" controls-position="right" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="纬度">
                <el-input-number v-model="settings.hotel_longitude" :precision="6" :step="0.001" style="width:100%" controls-position="right" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="地图选点">
                <MapPicker
                  :latitude="Number(settings.hotel_latitude) || 24.3282"
                  :longitude="Number(settings.hotel_longitude) || 109.2622"
                  @update:latitude="(v) => settings.hotel_latitude = String(v)"
                  @update:longitude="(v) => settings.hotel_longitude = String(v)"
                  @update:address="(v) => { if (!settings.hotel_address) settings.hotel_address = v }"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="取消政策"><el-input v-model="settings.cancel_policy" type="textarea" :rows="3" /></el-form-item>
            </el-col>
          </el-row>
          <el-button type="primary" @click="saveHotelSettings" :loading="saving">保存设置</el-button>
        </el-form>
      </el-card>

      <!-- Version Control -->
      <el-card v-if="activeTab === 'version'" shadow="hover">
        <template #header><span style="font-weight:600">小程序版本控制</span></template>
        <div v-loading="loadingSettings">
          <el-alert
            :title="appVersion === '0.0.1' ? '当前为审核模式，仅展示酒店位置信息' : '当前为正常模式，展示全部功能'"
            :type="appVersion === '0.0.1' ? 'warning' : 'success'"
            show-icon
            :closable="false"
            style="margin-bottom:20px"
          />
          <el-form label-width="100px">
            <el-form-item label="当前版本">
              <el-tag :type="appVersion === '0.0.1' ? 'warning' : 'success'" size="large">
                {{ appVersion }}
              </el-tag>
            </el-form-item>
            <el-form-item label="切换模式">
              <el-radio-group v-model="versionMode" @change="onVersionChange">
                <el-radio-button value="0.0.1">
                  <span>审核模式</span>
                  <el-tooltip content="仅展示酒店位置信息，隐藏预订、订单、会员等功能" placement="top">
                    <el-icon style="margin-left:4px;vertical-align:middle"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </el-radio-button>
                <el-radio-button value="1.0.0">
                  <span>正常模式</span>
                  <el-tooltip content="展示全部功能：房型浏览、预订、订单管理、会员中心等" placement="top">
                    <el-icon style="margin-left:4px;vertical-align:middle"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="versionMode !== appVersion">
              <el-button type="primary" @click="saveVersion" :loading="savingVersion">保存版本</el-button>
              <el-button @click="versionMode = appVersion">取消</el-button>
            </el-form-item>
          </el-form>
          <el-divider />
          <el-form label-width="100px">
            <el-form-item label="vConsole">
              <el-switch
                v-model="vconsoleEnabled"
                active-text="开启"
                inactive-text="关闭"
                @change="saveVconsole"
              />
              <el-tooltip content="开启后 H5 页面右下角出现绿色调试面板，可查看日志、网络请求等；关闭后刷新页面即隐藏" placement="top">
                <el-icon style="margin-left:8px;color:var(--text-secondary);cursor:help"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-form-item>
          </el-form>
        </div>
      </el-card>

      <!-- Admins -->
      <el-card v-if="activeTab === 'admins'" shadow="hover">
        <template #header>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600">管理员列表</span>
            <el-button type="primary" size="small" @click="openCreateAdmin">＋ 新增管理员</el-button>
          </div>
        </template>
        <el-table :data="admins" v-loading="loadingAdmins" stripe style="width:100%">
          <el-table-column prop="username" label="用户名" />
          <el-table-column label="角色" width="120">
            <template #default="{ row }"><el-tag size="small">{{ roleLabel(row) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }"><el-tag :type="row.status===1?'success':'danger'" size="small">{{ row.status===1?'正常':'禁用' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="创建时间" width="140">
            <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="240">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openEditAdmin(row)">编辑</el-button>
              <el-button type="warning" link size="small" @click="toggleAdminStatus(row)">{{ row.status===1?'禁用':'启用' }}</el-button>
              <el-button type="success" link size="small" @click="openResetPwd(row)">重置密码</el-button>
              <el-button type="danger" link size="small" @click="delAdmin(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Logs -->
      <el-card v-if="activeTab === 'logs'" shadow="hover">
        <template #header><span style="font-weight:600">操作日志</span></template>
        <el-table :data="logs" v-loading="loadingLogs" stripe style="width:100%">
          <el-table-column prop="admin_name" label="操作人" width="100" />
          <el-table-column prop="action" label="操作" min-width="140" />
          <el-table-column label="请求" width="200">
            <template #default="{ row }"><span class="mono">{{ row.method }} {{ row.path }}</span></template>
          </el-table-column>
          <el-table-column label="IP" width="140">
            <template #default="{ row }"><span class="mono">{{ row.ip }}</span></template>
          </el-table-column>
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
          </el-table-column>
        </el-table>
        <div style="display:flex;justify-content:flex-end;margin-top:16px" v-if="logTotal > logPageSize">
          <el-pagination background layout="prev, pager, next" :total="logTotal" :page-size="logPageSize" v-model:current-page="logPage" @current-change="loadLogs" />
        </div>
      </el-card>
    </div>
  </div>

  <!-- Admin Dialog -->
  <el-dialog v-model="showAdminModal" :title="editingAdmin ? '编辑管理员' : '新增管理员'" width="420px" destroy-on-close>
    <el-form :model="adminForm" label-width="80px">
      <el-form-item label="用户名">
        <el-input v-model="adminForm.username" :disabled="!!editingAdmin" />
      </el-form-item>
      <el-form-item label="初始密码" v-if="!editingAdmin">
        <el-input v-model="adminForm.password" type="password" show-password />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="adminForm.role" style="width:100%">
          <el-option label="前台" value="front_desk" />
          <el-option label="财务" value="finance" />
          <el-option label="运营" value="operation" />
          <el-option label="超级管理员" value="super" />
        </el-select>
      </el-form-item>
    </el-form>
    <el-alert v-if="adminFormErr" :title="adminFormErr" type="error" show-icon :closable="false" style="margin-bottom:16px" />
    <template #footer>
      <el-button @click="showAdminModal=false">取消</el-button>
      <el-button type="primary" @click="saveAdmin" :loading="savingAdmin">保存</el-button>
    </template>
  </el-dialog>

  <!-- Reset Password Dialog -->
  <el-dialog v-model="showPwdModal" title="重置密码" width="360px" destroy-on-close>
    <p style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">
      为管理员 <b>{{ resetTarget?.username }}</b> 设置新密码
    </p>
    <el-input v-model="resetPwd" type="password" show-password placeholder="请输入新密码（至少6位）" />
    <template #footer>
      <el-button @click="showPwdModal=false">取消</el-button>
      <el-button type="primary" @click="doResetPwd" :loading="resetting">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, inject, markRaw } from 'vue'
import { ElMessageBox } from 'element-plus'
import { OfficeBuilding, User, EditPen, Setting, QuestionFilled } from '@element-plus/icons-vue'
import { getSettings, saveSettings, getAdmins, createAdmin, updateAdmin, setAdminStatus, deleteAdmin, getLogs } from '@/api/system'
import MapPicker from '@/components/MapPicker.vue'

const toast = inject('toast')
const activeTab = ref('hotel')
const tabs = [
  { key: 'hotel',   icon: markRaw(OfficeBuilding), label: '酒店设置' },
  { key: 'version', icon: markRaw(Setting),         label: '版本控制' },
  { key: 'admins',  icon: markRaw(User),            label: '管理员' },
  { key: 'logs',    icon: markRaw(EditPen),         label: '操作日志' },
]

// Hotel settings
const settings = ref({})
const loadingSettings = ref(true)
const saving = ref(false)

const appVersion = computed(() => settings.value.app_version || '0.0.1')
const versionMode = ref('')
const savingVersion = ref(false)

// vConsole
const vconsoleEnabled = computed({
  get: () => settings.value.vconsole_enabled === 'true',
  set: (val) => { settings.value.vconsole_enabled = val ? 'true' : 'false'; },
})
async function saveVconsole() {
  try {
    await saveSettings({ vconsole_enabled: settings.value.vconsole_enabled });
    toast?.success(settings.value.vconsole_enabled === 'true' ? 'vConsole 已开启' : 'vConsole 已关闭');
  } catch (e) { toast?.error(e?.msg || '保存失败'); }
}

onMounted(async () => {
  try {
    const res = await getSettings()
    const flat = {}
    const grouped = res.data || {}
    for (const group of Object.values(grouped)) {
      if (Array.isArray(group)) {
        for (const item of group) {
          flat[item.key] = item.value
        }
      }
    }
    settings.value = flat
    versionMode.value = flat.app_version || '0.0.1'
  } catch {}
  loadingSettings.value = false
  loadAdmins()
  loadLogs()
})

async function saveHotelSettings() {
  saving.value = true
  try {
    const payload = { ...settings.value };
    // 经纬度统一转为字符串，避免 el-input-number 输出 number 导致类型不一致
    if (payload.hotel_latitude !== undefined) payload.hotel_latitude = String(payload.hotel_latitude);
    if (payload.hotel_longitude !== undefined) payload.hotel_longitude = String(payload.hotel_longitude);
    await saveSettings(payload);
    toast?.success('设置已保存');
  } catch (e) { toast?.error(e?.msg || '保存失败') }
  saving.value = false
}

// Version control
function onVersionChange(val) {
  // 切换回当前值时隐藏保存按钮（由 v-if 自动处理）
}
async function saveVersion() {
  savingVersion.value = true
  try {
    await saveSettings({ app_version: versionMode.value })
    settings.value.app_version = versionMode.value
    toast?.success(`已切换为${versionMode.value === '0.0.1' ? '审核模式' : '正常模式'}`)
  } catch (e) {
    toast?.error(e?.msg || '保存失败')
  }
  savingVersion.value = false
}

// Admins
const admins = ref([])
const loadingAdmins = ref(true)
const showAdminModal = ref(false)
const editingAdmin = ref(null)
const adminForm = ref({ username:'', password:'', role:'front_desk' })
const adminFormErr = ref('')
const savingAdmin = ref(false)
const showPwdModal = ref(false)
const resetTarget = ref(null)
const resetPwd = ref('')
const resetting = ref(false)
const roleMap = { super:'超级管理员', front_desk:'前台', finance:'财务', operation:'运营' }
const roleLabel = (row) => row.role_label || roleMap[row.role] || row.role
const fmtDate = (d) => d ? new Date(d).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '-'

async function loadAdmins() {
  loadingAdmins.value = true
  try { const res = await getAdmins(); admins.value = res.data?.list || res.data || [] } catch {}
  loadingAdmins.value = false
}

function openCreateAdmin() {
  editingAdmin.value = null
  adminForm.value = { username:'', password:'', role:'front_desk' }
  adminFormErr.value = ''
  showAdminModal.value = true
}
function openEditAdmin(a) {
  editingAdmin.value = a
  adminForm.value = { username: a.username, role: a.role }
  adminFormErr.value = ''
  showAdminModal.value = true
}

async function saveAdmin() {
  if (!adminForm.value.username) { adminFormErr.value = '请填写用户名'; return }
  if (!editingAdmin.value && !adminForm.value.password) { adminFormErr.value = '请填写初始密码'; return }
  savingAdmin.value = true
  try {
    if (editingAdmin.value) { await updateAdmin(editingAdmin.value.id, { role: adminForm.value.role }) }
    else { await createAdmin(adminForm.value) }
    toast?.success('操作成功')
    showAdminModal.value = false; loadAdmins()
  } catch (e) { adminFormErr.value = e?.msg || '操作失败' }
  savingAdmin.value = false
}

function openResetPwd(a) {
  resetTarget.value = a;
  resetPwd.value = '';
  showPwdModal.value = true;
}

async function doResetPwd() {
  if (!resetPwd.value || resetPwd.value.length < 6) {
    toast?.error('密码至少6位');
    return;
  }
  resetting.value = true;
  try {
    await updateAdmin(resetTarget.value.id, { password: resetPwd.value });
    toast?.success(`${resetTarget.value.username} 的密码已重置`);
    showPwdModal.value = false;
  } catch (e) { toast?.error(e?.msg || '重置失败'); }
  resetting.value = false;
}

async function toggleAdminStatus(a) {
  try {
    await setAdminStatus(a.id, { status: a.status === 1 ? 0 : 1 })
    toast?.success('操作成功'); loadAdmins()
  } catch (e) { toast?.error(e?.msg || '操作失败') }
}

async function delAdmin(a) {
  try {
    await ElMessageBox.confirm(`确认删除管理员 ${a.username}？`, '确认删除', { type: 'warning' })
    await deleteAdmin(a.id); toast?.success('删除成功'); loadAdmins()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '删除失败') }
}

// Logs
const logs = ref([])
const logTotal = ref(0)
const logPage = ref(1)
const logPageSize = 20
const loadingLogs = ref(true)

async function loadLogs() {
  loadingLogs.value = true
  try { const res = await getLogs({ page: logPage.value, pageSize: logPageSize }); logs.value = res.data?.list || []; logTotal.value = res.data?.total || 0 } catch {}
  loadingLogs.value = false
}
</script>
