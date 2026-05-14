import axios from 'axios'

// 生产环境用 VITE_API_BASE 环境变量，本地开发走 Vite 代理 /api/admin
const baseURL = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE}/api/admin`
  : '/api/admin'

const http = axios.create({
  baseURL,
  timeout: 15000
})

// 请求拦截 — 自动带 token
http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// 响应拦截 — 统一处理 401
http.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      // 用 BASE_URL 拼接，避免被部署到子路径（/admin/）时跳错
      // import.meta.env.BASE_URL 末尾自带 "/"，直接拼 "login"
      const base = import.meta.env.BASE_URL || '/'
      // 已经在 login 页就别再跳了，避免死循环
      const loginPath = `${base}login`.replace(/\/+/g, '/')
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath
      }
    }
    return Promise.reject(err.response?.data || err)
  }
)

export default http
