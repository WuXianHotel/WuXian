import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, getMe } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const user  = ref(null)
  const permissions = ref([])

  // 检查是否拥有某个权限
  function hasPermission(key) {
    // super 角色拥有所有权限
    if (user.value?.role === 'super') return true;
    return permissions.value.includes(key);
  }

  // 检查是否拥有任意一个权限
  function hasAnyPermission(...keys) {
    if (user.value?.role === 'super') return true;
    return keys.some(k => permissions.value.includes(k));
  }

  // 检查是否拥有所有权限
  function hasAllPermissions(...keys) {
    if (user.value?.role === 'super') return true;
    return keys.every(k => permissions.value.includes(k));
  }

  async function doLogin(username, password) {
    const res = await apiLogin({ username, password })
    token.value = res.data.token
    user.value  = res.data
    permissions.value = res.data.permissions || []
    localStorage.setItem('admin_token', res.data.token)
  }

  async function fetchMe() {
    try {
      const res = await getMe()
      user.value = res.data
      permissions.value = res.data.permissions || []
    } catch { logout() }
  }

  function logout() {
    token.value = ''
    user.value  = null
    permissions.value = []
    localStorage.removeItem('admin_token')
  }

  return { token, user, permissions, hasPermission, hasAnyPermission, hasAllPermissions, doLogin, fetchMe, logout }
})
