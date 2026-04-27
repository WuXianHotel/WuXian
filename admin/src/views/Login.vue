<template>
  <div class="login-page">
    <div class="login-left">
      <div class="brand">
        <el-icon class="brand-icon" :size="56"><OfficeBuilding /></el-icon>
        <h1>柳州无限电竞酒店</h1>
        <p>智慧酒店管理系统</p>
      </div>
      <div class="features">
        <div class="feat"><el-icon :size="20"><DataAnalysis /></el-icon> 实时运营数据看板</div>
        <div class="feat"><el-icon :size="20"><House /></el-icon> 智能房态管理</div>
        <div class="feat"><el-icon :size="20"><User /></el-icon> 会员全生命周期管理</div>
        <div class="feat"><el-icon :size="20"><TrendCharts /></el-icon> 多维财务分析报表</div>
      </div>
    </div>

    <div class="login-right">
      <el-card class="login-card" shadow="always">
        <h2>管理员登录</h2>
        <p class="sub">请使用您的管理员账号登录</p>

        <el-form :model="form" @submit.prevent="handleLogin" label-position="top">
          <el-form-item label="用户名">
            <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="UserIcon" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password :prefix-icon="Lock" />
          </el-form-item>

          <el-alert v-if="errMsg" :title="errMsg" type="error" show-icon :closable="false" style="margin-bottom:16px" />

          <el-button type="primary" native-type="submit" :loading="loading" size="large" class="login-btn">
            {{ loading ? '登录中…' : '登 录' }}
          </el-button>
        </el-form>

        <p class="hint">默认账号：admin / Admin@123</p>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  User as UserIcon, Lock, OfficeBuilding,
  DataAnalysis, House, TrendCharts
} from '@element-plus/icons-vue'

const auth    = useAuthStore()
const router  = useRouter()
const loading = ref(false)
const errMsg  = ref('')
const form    = reactive({ username: '', password: '' })

async function handleLogin() {
  errMsg.value = ''
  loading.value = true
  try {
    await auth.doLogin(form.username, form.password)
    router.push('/dashboard')
  } catch (e) {
    errMsg.value = e?.msg || '用户名或密码错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { display: flex; height: 100vh; }

.login-left {
  flex: 1; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
  display: flex; flex-direction: column; justify-content: center;
  padding: 60px; color: #fff;
}
.brand { margin-bottom: 48px; }
.brand-icon { margin-bottom: 16px; }
.brand h1 { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
.brand p { font-size: 16px; color: rgba(255,255,255,.6); }
.features { display: flex; flex-direction: column; gap: 16px; }
.feat { display: flex; align-items: center; gap: 12px; font-size: 15px; color: rgba(255,255,255,.8); }

.login-right {
  width: 480px; display: flex; align-items: center; justify-content: center;
  background: #f0f4f8;
}
.login-card { width: 380px; }
.login-card h2 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.sub { color: var(--text-secondary); font-size: 13px; margin-bottom: 28px; }
.login-btn { width: 100%; font-size: 15px; }
.hint { margin-top: 16px; text-align: center; font-size: 12px; color: var(--text-muted); }
</style>
