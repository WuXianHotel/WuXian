// pages/points_mall/points_mall.js
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    activeTab: 'products',
    products: [],
    memberPoints: 0,
    loading: true,
    // 兑换记录
    records: [],
    recordsPage: 1,
    recordsLoading: false,
    recordsNoMore: false,
    // 兑换弹窗
    showExchange: false,
    exchangeProduct: null,
    exchangeForm: { address: '', phone: '', receiver: '' },
    exchanging: false,
  },

  onLoad() {
    this.loadProducts()
    this.loadPoints()
  },

  // ── Tab 切换 ──
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
    if (tab === 'records' && !this.data.records.length) {
      this.loadRecords(true)
    }
  },

  // ── 商品列表 ──
  async loadProducts() {
    this.setData({ loading: true })
    try {
      const res = await api.getMallProducts({ page: 1, pageSize: 50 })
      this.setData({ products: res.data?.list || [] })
    } catch (e) {}
    this.setData({ loading: false })
  },

  async loadPoints() {
    try {
      const res = await api.getMemberInfo()
      this.setData({ memberPoints: res.data?.points || 0 })
    } catch (e) {}
  },

  // ── 兑换记录 ──
  async loadRecords(reset) {
    if (reset) this.setData({ recordsPage: 1, records: [], recordsNoMore: false })
    this.setData({ recordsLoading: true })
    try {
      const { recordsPage } = this.data
      const res = await api.getExchangeRecords({ page: recordsPage, pageSize: 20 })
      const list = res.data?.list || []
      this.setData({
        records: reset ? list : [...this.data.records, ...list],
        recordsNoMore: list.length < 20,
      })
    } catch (e) {}
    this.setData({ recordsLoading: false })
  },

  loadMoreRecords() {
    if (this.data.recordsNoMore || this.data.recordsLoading) return
    this.setData({ recordsPage: this.data.recordsPage + 1 }, () => this.loadRecords())
  },

  // ── 兑换弹窗 ──
  openExchange(e) {
    const product = e.currentTarget.dataset.item
    if (this.data.memberPoints < product.points_cost) {
      wx.showToast({ title: '积分不足', icon: 'none' }); return
    }
    this.setData({
      showExchange: true,
      exchangeProduct: product,
      exchangeForm: { address: '', phone: '', receiver: '' },
    })
  },

  closeExchange() {
    this.setData({ showExchange: false, exchangeProduct: null })
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`exchangeForm.${field}`]: e.detail.value })
  },

  async doExchange() {
    const { exchangeProduct, exchangeForm } = this.data
    if (!exchangeProduct) return
    // 所有商品均需填写收货信息
    if (!exchangeForm.receiver.trim()) { wx.showToast({ title: '请填写收件人', icon: 'none' }); return }
    if (!exchangeForm.phone.trim()) { wx.showToast({ title: '请填写手机号', icon: 'none' }); return }
    if (!exchangeForm.address.trim()) { wx.showToast({ title: '请填写收货地址', icon: 'none' }); return }
    this.setData({ exchanging: true })
    try {
      const data = {
        productId: exchangeProduct.id,
        receiver: exchangeForm.receiver,
        phone: exchangeForm.phone,
        address: exchangeForm.address,
      }
      const res = await api.exchangeProduct(data)
      wx.showToast({ title: res.msg || '兑换成功', icon: 'success' })
      this.closeExchange()
      this.loadProducts()
      this.loadPoints()
      // 刷新兑换记录
      this.loadRecords(true)
    } catch (e) {}
    this.setData({ exchanging: false })
  },

  // 阻止事件冒泡
  preventBubble() {},

  goBack() { wx.navigateBack() },
})
