// pages/wallet/wallet.js
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    balance: 0,
    rechargeAmount: '',
    logs: [],
    page: 1, pageSize: 20, noMore: false,
    loading: false, recharging: false
  },

  onLoad() {
    this.loadBalance()
    this.loadLogs(true)
  },

  async loadBalance() {
    try {
      const res = await api.getWalletInfo()
      this.setData({ balance: res.data?.balance || 0 })
    } catch (e) {}
  },

  async loadLogs(reset) {
    if (reset) this.setData({ page: 1, logs: [], noMore: false })
    this.setData({ loading: true })
    try {
      const { page, pageSize } = this.data
      const res = await api.getWalletLogs({ page, pageSize })
      const list = res.data?.list || []
      this.setData({
        logs: reset ? list : [...this.data.logs, ...list],
        noMore: list.length < pageSize
      })
    } catch (e) {}
    this.setData({ loading: false })
  },

  loadMore() {
    if (this.data.noMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 }, () => this.loadLogs())
  },

  onAmountInput(e) {
    this.setData({ rechargeAmount: e.detail.value })
  },

  quickAmount(e) {
    this.setData({ rechargeAmount: e.currentTarget.dataset.amount })
  },

  async doRecharge() {
    const amount = Number(this.data.rechargeAmount)
    if (!amount || amount < 1) {
      wx.showToast({ title: '请输入正确的充值金额', icon: 'none' }); return
    }
    this.setData({ recharging: true })
    try {
      await api.recharge({ amount })
      wx.showToast({ title: '充值成功', icon: 'success' })
      this.setData({ rechargeAmount: '' })
      this.loadBalance()
      this.loadLogs(true)
    } catch (e) {}
    this.setData({ recharging: false })
  },

  goBack() { wx.navigateBack() }
})
