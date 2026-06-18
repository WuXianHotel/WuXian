<template>
  <div class="role-management">
    <!-- 左侧角色列表 -->
    <div class="role-left">
      <el-card shadow="hover" class="role-list-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">角色列表</span>
            <el-button type="primary" size="small" @click="openCreateRole">
              <el-icon><Plus /></el-icon> 新增角色
            </el-button>
          </div>
        </template>
        <div v-loading="loadingRoles" class="role-items">
          <div
            v-for="role in roles"
            :key="role.id"
            :class="['role-item', { active: selectedRole?.id === role.id }]"
            @click="selectRole(role)"
          >
            <div class="role-item__info">
              <span class="role-item__name">{{ role.label }}</span>
              <span class="role-item__key">{{ role.name }}</span>
            </div>
            <div class="role-item__meta">
              <el-tag size="small" :type="role.is_system ? 'info' : ''">
                {{ role.is_system ? '内置' : '自定义' }}
              </el-tag>
              <span class="role-item__count">{{ role.admin_count }}人 · {{ role.permission_count }}项权限</span>
            </div>
          </div>
          <el-empty v-if="!loadingRoles && roles.length === 0" description="暂无角色" />
        </div>
      </el-card>
    </div>

    <!-- 右侧详情 & 权限分配 -->
    <div class="role-right" v-if="selectedRole">
      <el-card shadow="hover" class="role-detail-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">{{ selectedRole.label }} - 权限配置</span>
            <div style="display:flex;gap:8px">
              <el-button
                v-if="!selectedRole.is_system"
                type="danger"
                size="small"
                plain
                @click="handleDeleteRole"
                :loading="deleting"
              >
                <el-icon><Delete /></el-icon> 删除角色
              </el-button>
            </div>
          </div>
        </template>

        <el-form label-width="80px" v-if="!selectedRole.is_system">
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="角色标识">
                <el-input v-model="editForm.name" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="角色名称">
                <el-input v-model="editForm.label" placeholder="请输入角色名称" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="描述">
                <el-input v-model="editForm.description" placeholder="角色描述（选填）" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-button type="primary" @click="saveRoleInfo" :loading="savingInfo" style="margin-bottom:16px">
            保存基本信息
          </el-button>
        </el-form>

        <!-- 权限分配区域 -->
        <div class="permission-section">
          <div class="section-header">
            <span>模块权限分配</span>
            <el-button type="primary" size="small" @click="savePermissions" :loading="savingPerms">
              <el-icon><Check /></el-icon> 保存权限设置
            </el-button>
          </div>

          <div v-loading="loadingPerms" class="permission-modules">
            <div v-for="(perms, module) in permissionModules" :key="module" class="permission-module">
              <div class="module-header">
                <el-checkbox
                  :model-value="isModuleAllChecked(perms)"
                  :indeterminate="isModuleIndeterminate(perms)"
                  @change="(val) => toggleModule(perms, val)"
                >
                  <span class="module-name">{{ moduleLabels[module] || module }}</span>
                </el-checkbox>
              </div>
              <div class="module-items">
                <el-checkbox
                  v-for="perm in perms"
                  :key="perm.id"
                  :model-value="checkedPermIds.includes(perm.id)"
                  @change="(val) => togglePermission(perm.id, val)"
                >
                  {{ perm.label }}
                </el-checkbox>
              </div>
            </div>
            <el-empty v-if="!loadingPerms && !Object.keys(permissionModules).length" description="暂无权限定义" />
          </div>
        </div>
      </el-card>

      <!-- 角色下管理员列表 -->
      <el-card shadow="hover" style="margin-top:16px" v-if="selectedRole">
        <template #header><span class="card-title">拥有此角色的管理员</span></template>
        <el-table :data="roleAdmins" v-loading="loadingAdmins" stripe size="small">
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="real_name" label="姓名" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '正常' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="160">
            <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 未选择角色时的占位 -->
    <div class="role-right role-placeholder" v-else>
      <el-empty description="请从左侧选择一个角色以配置权限" />
    </div>

    <!-- 新增/编辑角色弹窗 -->
    <el-dialog
      v-model="showRoleDialog"
      :title="editingRole ? '编辑角色' : '新增角色'"
      width="460px"
      destroy-on-close
    >
      <el-form :model="roleForm" label-width="80px">
        <el-form-item label="角色标识" v-if="!editingRole">
          <el-input v-model="roleForm.name" placeholder="英文标识，如 front_desk" />
          <div class="form-tip">仅支持小写字母、数字和下划线</div>
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input v-model="roleForm.label" placeholder="显示名称，如 前台" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" type="textarea" :rows="2" placeholder="角色描述（选填）" />
        </el-form-item>
      </el-form>
      <el-alert v-if="roleFormErr" :title="roleFormErr" type="error" show-icon :closable="false" style="margin-bottom:16px" />
      <template #footer>
        <el-button @click="showRoleDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveRole" :loading="savingRole">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Plus, Delete, Check } from '@element-plus/icons-vue';
import {
  getRoles, createRole, updateRole, deleteRole,
  setRolePermissions, getRoleAdmins, getPermissions, getRoleDetail,
} from '@/api/roles';

const toast = inject('toast');

// 模块中文名映射
const moduleLabels = {
  dashboard: '仪表盘',
  rooms: '房型管理',
  orders: '订单管理',
  members: '会员管理',
  reports: '财务报表',
  mall: '积分商城',
  banners: 'Banner管理',
  system: '系统设置',
  roles: '角色权限',
};

// ── 角色列表 ──
const roles = ref([]);
const loadingRoles = ref(false);
const selectedRole = ref(null);

async function loadRoles() {
  loadingRoles.value = true;
  try {
    const res = await getRoles();
    roles.value = res.data || [];
    // 如果当前选中的角色被删除，清除选中
    if (selectedRole.value && !roles.value.find(r => r.id === selectedRole.value.id)) {
      selectedRole.value = null;
      permissionModules.value = {};
      checkedPermIds.value = [];
    }
  } catch (e) {
    toast?.error(e?.msg || '加载角色列表失败');
  }
  loadingRoles.value = false;
}

function selectRole(role) {
  selectedRole.value = role;
  editForm.name = role.name;
  editForm.label = role.label;
  editForm.description = role.description || '';
  loadRolePermissions(role.id);
  loadAdminsByRole(role.id);
}

// ── 角色基本信息编辑 ──
const editForm = reactive({ name: '', label: '', description: '' });
const savingInfo = ref(false);

async function saveRoleInfo() {
  if (!editForm.label) {
    toast?.error('角色名称不能为空');
    return;
  }
  savingInfo.value = true;
  try {
    await updateRole(selectedRole.value.id, {
      label: editForm.label,
      description: editForm.description,
    });
    toast?.success('角色信息已更新');
    loadRoles();
  } catch (e) {
    toast?.error(e?.msg || '保存失败');
  }
  savingInfo.value = false;
}

// ── 新增/编辑角色弹窗 ──
const showRoleDialog = ref(false);
const editingRole = ref(null);
const roleForm = reactive({ name: '', label: '', description: '' });
const roleFormErr = ref('');
const savingRole = ref(false);

function openCreateRole() {
  editingRole.value = null;
  roleForm.name = '';
  roleForm.label = '';
  roleForm.description = '';
  roleFormErr.value = '';
  showRoleDialog.value = true;
}

async function handleSaveRole() {
  if (!roleForm.name) { roleFormErr.value = '请输入角色标识'; return; }
  if (!/^[a-z_][a-z0-9_]*$/.test(roleForm.name)) { roleFormErr.value = '角色标识仅支持小写字母、数字和下划线'; return; }
  if (!roleForm.label) { roleFormErr.value = '请输入角色名称'; return; }

  savingRole.value = true;
  try {
    if (editingRole.value) {
      await updateRole(editingRole.value.id, { label: roleForm.label, description: roleForm.description });
    } else {
      await createRole({ name: roleForm.name, label: roleForm.label, description: roleForm.description });
    }
    toast?.success(editingRole.value ? '角色已更新' : '角色创建成功');
    showRoleDialog.value = false;
    loadRoles();
  } catch (e) {
    roleFormErr.value = e?.msg || '操作失败';
  }
  savingRole.value = false;
}

// ── 删除角色 ──
const deleting = ref(false);

async function handleDeleteRole() {
  try {
    await ElMessageBox.confirm(
      `确认删除角色「${selectedRole.value.label}」？删除后不可恢复。`,
      '确认删除',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  deleting.value = true;
  try {
    await deleteRole(selectedRole.value.id);
    toast?.success('角色已删除');
    selectedRole.value = null;
    loadRoles();
  } catch (e) {
    toast?.error(e?.msg || '删除失败');
  }
  deleting.value = false;
}

// ── 权限配置 ──
const permissionModules = ref({});
const allPermissions = ref([]);
const checkedPermIds = ref([]);
const loadingPerms = ref(false);
const savingPerms = ref(false);

async function loadAllPermissions() {
  try {
    const res = await getPermissions();
    allPermissions.value = res.data?.list || [];
    permissionModules.value = res.data?.grouped || {};
  } catch (e) {
    toast?.error(e?.msg || '加载权限定义失败');
  }
}

async function loadRolePermissions(roleId) {
  loadingPerms.value = true;
  try {
    const res = await getRoleDetail(roleId);
    const permissions = res.data?.permissions || [];
    checkedPermIds.value = permissions.map(p => p.id);
  } catch (e) {
    toast?.error(e?.msg || '加载角色权限失败');
  }
  loadingPerms.value = false;
}

function togglePermission(permId, checked) {
  if (checked) {
    if (!checkedPermIds.value.includes(permId)) {
      checkedPermIds.value.push(permId);
    }
  } else {
    checkedPermIds.value = checkedPermIds.value.filter(id => id !== permId);
  }
}

function isModuleAllChecked(perms) {
  return perms.length > 0 && perms.every(p => checkedPermIds.value.includes(p.id));
}

function isModuleIndeterminate(perms) {
  const checkedCount = perms.filter(p => checkedPermIds.value.includes(p.id)).length;
  return checkedCount > 0 && checkedCount < perms.length;
}

function toggleModule(perms, checked) {
  const ids = perms.map(p => p.id);
  if (checked) {
    ids.forEach(id => {
      if (!checkedPermIds.value.includes(id)) checkedPermIds.value.push(id);
    });
  } else {
    checkedPermIds.value = checkedPermIds.value.filter(id => !ids.includes(id));
  }
}

async function savePermissions() {
  if (!selectedRole.value) return;
  savingPerms.value = true;
  try {
    await setRolePermissions(selectedRole.value.id, checkedPermIds.value);
    toast?.success(`已为「${selectedRole.value.label}」保存权限配置`);
    loadRoles();
  } catch (e) {
    toast?.error(e?.msg || '保存权限失败');
  }
  savingPerms.value = false;
}

// ── 角色管理员列表 ──
const roleAdmins = ref([]);
const loadingAdmins = ref(false);

async function loadAdminsByRole(roleId) {
  loadingAdmins.value = true;
  try {
    const res = await getRoleAdmins(roleId);
    roleAdmins.value = res.data || [];
  } catch {
    roleAdmins.value = [];
  }
  loadingAdmins.value = false;
}

// ── 工具函数 ──
const fmtDate = d => d ? new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

// ── 初始化 ──
onMounted(() => {
  loadRoles();
  loadAllPermissions();
});
</script>

<style scoped>
.role-management {
  display: flex;
  gap: 16px;
  height: 100%;
}

/* 左侧 */
.role-left {
  width: 300px;
  flex-shrink: 0;
}
.role-list-card {
  height: 100%;
}
.role-list-card :deep(.el-card__body) {
  padding: 0;
}
.role-items {
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

.role-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background .2s;
}
.role-item:hover {
  background: var(--el-fill-color-light);
}
.role-item.active {
  background: var(--el-color-primary-light-9);
  border-left: 3px solid var(--el-color-primary);
}
.role-item__info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.role-item__name {
  font-weight: 600;
  font-size: 14px;
}
.role-item__key {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}
.role-item__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.role-item__count {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

/* 右侧 */
.role-right {
  flex: 1;
  overflow-y: auto;
}
.role-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-weight: 600;
}

/* 权限分配 */
.permission-section {
  margin-top: 8px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-weight: 600;
}

.permission-modules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.permission-module {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
}
.module-header {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}
.module-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}
.module-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.module-items .el-checkbox {
  margin-right: 0;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
}
</style>
