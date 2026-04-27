import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, getMe } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const user  = ref(null)

  async function doLogin(username, password) {
    const res = await apiLogin({ username, password })
    token.value = res.data.token
    user.value  = res.data
    localStorage.setItem('admin_token', res.data.token)
  }

  async function fetchMe() {
    try {
      const res = await getMe()
      user.value = res.data
    } catch { logout() }
  }

  function logout() {
    token.value = ''
    user.value  = null
    localStorage.removeItem('admin_token')
  }

  return { token, user, doLogin, fetchMe, logout }
})
