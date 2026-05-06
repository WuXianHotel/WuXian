// pages/profile/profile.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const { uploadToCos } = require('../../utils/cos-upload')
const app = getApp()

Page({
  data: {
    userInfo: {},
    memberInfo: {},
    maskedPhone: '',
    orderBadge: 0,
    couponBadge: 0,
    globalToken: '',
    hotelConfig: {}
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    const userInfo = app.globalData.userInfo || {}
    this.setData({
      userInfo,
      globalToken: app.globalData.token || '',
      maskedPhone: util.maskPhone(userInfo.phone)
    })
    this.loadHotelConfig()
    if (app.globalData.token) {
      this.loadMemberInfo()
    }
  },

  async loadMemberInfo() {
    try {
      const res = await api.getMemberInfo()
      const info = res.data || {}
      this.setData({ memberInfo: info, couponBadge: info.couponCount || 0 })
    } catch (e) {
      this.setData({
        memberInfo: { levelName: '黄金会员', points: 2380 },
        couponBadge: 3
      })
    }
    // 获取待处理订单数
    try {
      const res = await api.getOrders({ status: 'pending_payment', page: 1, pageSize: 1 })
      this.setData({ orderBadge: res.data?.total || 0 })
    } catch (e) {}
  },

  // 微信头像授权回调
  async onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl
    if (!tempPath) return
    // 如果未登录，先登录
    if (!app.globalData.token) {
      try { await app.login() } catch (err) {
        wx.showToast({ title: '请先登录', icon: 'none' }); return
      }
    }
    wx.showLoading({ title: '上传中...' })
    try {
      // 上传到 COS
      const avatarUrl = await uploadToCos(tempPath, 'avatars/')
      if (!avatarUrl || !/^https?:\/\//.test(avatarUrl)) {
        throw new Error('COS 返回 URL 无效：' + avatarUrl)
      }
      // 保存到后端
      await api.updateProfile({ avatarUrl })
      await app.fetchProfile()
      this.setData({ userInfo: app.globalData.userInfo, globalToken: app.globalData.token })
      wx.hideLoading()
      wx.showToast({ title: '头像已更新', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('[onChooseAvatar] 上传失败', err)
      wx.showModal({
        title: '头像上传失败',
        content: (err && err.errMsg) || (err && err.message) || '请稍后重试',
        showCancel: false
      })
    }
  },

  // 微信昵称填写回调
  async onNicknameChange(e) {
    const nickname = (e.detail.value || '').trim()
    if (!nickname) return
    if (!app.globalData.token) {
      try { await app.login() } catch (err) {
        wx.showToast({ title: '请先登录', icon: 'none' }); return
      }
    }
    try {
      await api.updateProfile({ nickname })
      await app.fetchProfile()
      this.setData({ userInfo: app.globalData.userInfo, globalToken: app.globalData.token })
      wx.showToast({ title: '昵称已更新', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  async doLogin() {
    wx.showLoading({ title: '登录中...' })
    try {
      await app.login()
      const userInfo = app.globalData.userInfo || {}
      this.setData({
        userInfo,
        globalToken: app.globalData.token || '',
        maskedPhone: util.maskPhone(userInfo.phone)
      })
      this.loadMemberInfo()
      wx.showToast({ title: '登录成功', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  goOrders() { wx.switchTab({ url: '/pages/orders/orders' }) },
  goMember() { wx.navigateTo({ url: '/pages/member/member' }) },
  goCoupons() { wx.navigateTo({ url: '/pages/member/member?tab=coupons' }) },
  goInvoice() { wx.showToast({ title: '功能开发中', icon: 'none' }) },
  goPersonalInfo() { wx.navigateTo({ url: '/pages/profile_edit/profile_edit' }) },
  goSecurity() { wx.navigateTo({ url: '/pages/profile_edit/profile_edit' }) },
  // goNotifications() { wx.showToast({ title: '功能开发中', icon: 'none' }) },
  // goHelp() { wx.showToast({ title: '功能开发中', icon: 'none' }) },
  // contactService() { wx.makePhoneCall({ phoneNumber: '400-XXX-XXXX' }) },

  // 联系酒店前台（与首页 callHotel 一致）
  callHotel() {
    const phone = this.data.hotelConfig.hotel_phone || '400-000-0000'
    wx.makePhoneCall({ phoneNumber: phone })
  },

  async loadHotelConfig() {
    try {
      const res = await api.getHotelConfig()
      this.setData({ hotelConfig: res.data || {} })
    } catch (e) {}
  },

  // 退出登录功能已注释，不再暴露给用户
  // async logout() {
  //   const res = await new Promise(resolve => {
  //     wx.showModal({ title: '退出登录', content: '确定要退出登录吗？', success: resolve })
  //   })
  //   if (!res.confirm) return
  //   app.globalData.token = ''
  //   app.globalData.userInfo = null
  //   wx.removeStorageSync('token')
  //   wx.removeStorageSync('userInfo')
  //   this.setData({ userInfo: {}, memberInfo: {}, orderBadge: 0, couponBadge: 0, globalToken: '' })
  //   wx.showToast({ title: '已退出登录', icon: 'success' })
  // }
})
