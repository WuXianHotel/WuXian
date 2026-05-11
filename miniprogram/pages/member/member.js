// pages/member/member.js
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    userInfo: {},
    memberInfo: {},
    walletBalance: 0,
    pointsHistory: [],
    walletHistory: [],
    activeTab: 'points' // points | wallet
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || {}
    this.setData({ userInfo })
    this.loadMemberInfo()
    this.loadPoints()
    this.loadWallet()
  },

  onShow() {
    // 从其他页面返回时刷新数据
    this.loadMemberInfo()
    this.loadWallet()
  },

  async loadMemberInfo() {
    try {
      const res = await api.getMemberInfo()
      const info = res.data || {}
      this.setData({
        memberInfo: info,
        walletBalance: Number(info.wallet_balance) || 0
      })
    } catch (e) {}
  },

  async loadPoints() {
    try {
      const res = await api.getPointsHistory({ page: 1, pageSize: 10 })
      this.setData({ pointsHistory: res.data?.list || [] })
    } catch (e) {}
  },

  async loadWallet() {
    try {
      const res = await api.getWalletLogs({ page: 1, pageSize: 10 })
      this.setData({ walletHistory: res.data?.list || [] })
    } catch (e) {}
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  goLevelProgress() {
    wx.navigateTo({ url: '/pages/member_level/member_level' })
  },

  goWallet() {
    wx.navigateTo({ url: '/pages/wallet/wallet' })
  },

  goPointsMall() {
    wx.navigateTo({ url: '/pages/points_mall/points_mall' })
  }
})
