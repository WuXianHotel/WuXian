<template>
  <div>
    <el-card shadow="hover" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600">Banner 轮播图管理</span>
        <el-button type="primary" size="small" @click="openCreate">＋ 新增 Banner</el-button>
      </div>
    </el-card>

    <el-card shadow="hover">
      <el-table :data="banners" v-loading="loading" stripe style="width:100%">
        <el-table-column label="预览" width="120">
          <template #default="{ row }">
            <el-image
              :src="row.image"
              style="width:100px;height:56px;border-radius:6px;object-fit:cover"
              fit="cover"
              lazy
            >
              <template #error><span style="font-size:12px;color:#94a3b8">加载失败</span></template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="120">
          <template #default="{ row }">{{ row.title || '-' }}</template>
        </el-table-column>
        <el-table-column label="跳转链接" min-width="150">
          <template #default="{ row }">{{ row.link_url || '-' }}</template>
        </el-table-column>
        <el-table-column label="排序" width="70" align="center">
          <template #default="{ row }">{{ row.sort_order }}</template>
        </el-table-column>
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'显示':'隐藏' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="doDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增 / 编辑 Dialog -->
    <el-dialog v-model="showModal" :title="editingId ? '编辑 Banner' : '新增 Banner'" width="560px" destroy-on-close>
      <el-form :model="form" label-width="80px">
        <el-form-item label="图片" required>
          <div style="display:flex;flex-direction:column;gap:10px">
            <!-- 已上传预览 -->
            <el-image
              v-if="form.image && /^https?:\/\//.test(form.image)"
              :src="form.image"
              style="width:100%;max-height:200px;border-radius:8px;object-fit:cover"
              fit="cover"
            >
              <template #error><span style="font-size:12px;color:#94a3b8">图片加载失败</span></template>
            </el-image>
            <!-- COS 上传 -->
            <div style="display:flex;align-items:center;gap:10px">
              <el-upload
                :show-file-list="false"
                :before-upload="handleImageUpload"
                accept="image/*"
              >
                <el-button size="small" type="primary" plain :loading="uploading">上传到 COS</el-button>
              </el-upload>
              <span style="font-size:12px;color:#94a3b8">或粘贴 CDN 地址</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="图片地址">
          <el-input v-model="form.image" placeholder="COS 自动填充或手动输入 CDN 完整 URL" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="可选，轮播图标题" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.linkUrl" placeholder="可选，点击跳转的地址" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" style="width:140px" />
          <span style="margin-left:8px;font-size:12px;color:#94a3b8">越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="显示" inactive-text="隐藏" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showModal=false">取消</el-button>
        <el-button type="primary" @click="saveBanner" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { ElMessageBox } from 'element-plus'
import { getBanners, createBanner, updateBanner, deleteBanner } from '@/api/banner'
import { uploadToCos, signUrls } from '@/api/upload'

const toast = inject('toast')
const loading = ref(true)
const banners = ref([])
const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)
const uploading = ref(false)
const form = ref({})

async function loadBanners() {
  loading.value = true
  try {
    const res = await getBanners()
    banners.value = res.data || []
  } catch { toast?.error('加载失败') }
  loading.value = false
}

function openCreate() {
  editingId.value = null
  form.value = { image: '', title: '', linkUrl: '', sortOrder: 0, status: 1 }
  showModal.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = {
    image: row.image,
    title: row.title || '',
    linkUrl: row.link_url || '',
    sortOrder: row.sort_order || 0,
    status: row.status ?? 1,
  }
  showModal.value = true
}

async function handleImageUpload(file) {
  uploading.value = true
  try {
    const url = await uploadToCos(file, 'banners/')
    // 签名 URL 以确保上传后即可预览（COS 私有 Bucket 需要签名）
    const res = await signUrls([url])
    form.value.image = (res.data && res.data[0]) || url
    toast?.success('图片上传成功')
  } catch (e) {
    toast?.error('上传失败: ' + (e.message || e))
  }
  uploading.value = false
  return false
}

async function saveBanner() {
  if (!form.value.image) { toast?.error('请上传图片或填写图片地址'); return }
  saving.value = true
  try {
    // 剥离签名参数，存入数据库的应为原始 CDN URL
    const payload = { ...form.value, image: String(form.value.image).split('?')[0] }
    if (editingId.value) {
      await updateBanner(editingId.value, payload)
      toast?.success('更新成功')
    } else {
      await createBanner(payload)
      toast?.success('创建成功')
    }
    showModal.value = false
    loadBanners()
  } catch (e) { toast?.error(e?.msg || '操作失败') }
  saving.value = false
}

async function doDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除该 Banner？`, '确认删除', { type: 'warning' })
    await deleteBanner(row.id)
    toast?.success('已删除')
    loadBanners()
  } catch (e) { if (e !== 'cancel') toast?.error(e?.msg || '删除失败') }
}

onMounted(() => { loadBanners() })
</script>
