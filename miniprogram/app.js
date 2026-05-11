// app.js
const iconfontBase64 = require('./assets/iconfont/iconfont-base64')

App({
  globalData: {
    userInfo: null,
    token: '',
    apiBase: 'https://wuxian-hotel.online'
  },

  onLaunch() {
    console.log('[app] onLaunch 启动')
    // 加载 iconfont 字体
    wx.loadFontFace({
      family: 'iconfont',
      source: `url("${iconfontBase64}")`,
      global: true,
      success: () => console.log('[app] iconfont 字体加载成功'),
      fail: (err) => console.error('[app] iconfont 字体加载失败', err)
    })
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token) {
      this.globalData.token = token
    }
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
    // 静默登录：无 token 时自动用 wx.login code 换取 JWT
    if (!token) {
      this.login().catch(() => {})
    }
  },

  // 全局登录（静默登录）
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            console.log('[login] wx.login 成功，code:', res.code.slice(0, 6) + '...')
            wx.request({
              url: `${this.globalData.apiBase}/api/mp/auth/login`,
              method: 'POST',
              data: { code: res.code },
              success: (result) => {
                const body = result.data || {}
                const payload = body.data || {}
                if (body.code === 0 && payload.token) {
                  console.log('[login] 登录成功，userId:', payload.userId)
                  this.globalData.token = payload.token
                  wx.setStorageSync('token', payload.token)
                  // 登录成功后拉取完整用户资料
                  this.fetchProfile().then(profile => {
                    resolve(profile)
                  }).catch(() => {
                    // profile 拉取失败时退回 login 返回的基础信息
                    this.globalData.userInfo = payload
                    wx.setStorageSync('userInfo', payload)
                    resolve(payload)
                  })
                } else {
                  console.error('[login] 登录失败，响应:', body)
                  reject(body)
                }
              },
              fail: (err) => {
                console.error('[login] 网络请求失败:', err)
                reject(err)
              }
            })
          } else {
            reject(new Error('wx.login failed'))
          }
        },
        fail: reject
      })
    })
  },

  // 拉取完整用户资料并缓存
  fetchProfile() {
    return new Promise((resolve, reject) => {
      const token = this.globalData.token
      wx.request({
        url: `${this.globalData.apiBase}/api/mp/auth/profile`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          const body = res.data || {}
          if (body.code === 0 && body.data) {
            console.log('[fetchProfile] 用户资料:', body.data.nickname, body.data.avatar_url)
            this.globalData.userInfo = body.data
            wx.setStorageSync('userInfo', body.data)
            resolve(body.data)
          } else {
            console.error('[fetchProfile] 拉取失败:', body)
            reject(body)
          }
        },
        fail: (err) => {
          console.error('[fetchProfile] 网络请求失败:', err)
          reject(err)
        }
      })
    })
  },

  // 确保已登录；未登录时先触发登录再继续，失败则弹提示
  ensureLogin() {
    console.log('this.globalData.token', this.globalData.token)
    if (this.globalData.token) return Promise.resolve()
    wx.showLoading({ title: '登录中...' })
    return this.login()
      .then(() => { wx.hideLoading() })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        return Promise.reject(err)
      })
  }
})
