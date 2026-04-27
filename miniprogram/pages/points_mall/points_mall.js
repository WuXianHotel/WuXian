// pages/points_mall/points_mall.js
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    products: [],
    memberPoints: 0,
    loading: true,
    // 兑换弹窗
    showExchange: false,
    exchangeProduct: null,
    exchangeForm: { address: '', phone: '', receiver: '' },
    exchanging: false
  },

  onLoad() {
    this.loadProducts()
    this.loadPoints()
  },

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

  openExchange(e) {
    const product = e.currentTarget.dataset.item
    if (this.data.memberPoints < product.points_cost) {
      wx.showToast({ title: '积分不足', icon: 'none' }); return
    }
    this.setData({
      showExchange: true,
      exchangeProduct: product,
      exchangeForm: { address: '', phone: '', receiver: '' }
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
    // 实物需要收货信息
    if (exchangeProduct.type === 1) {
      if (!exchangeForm.receiver.trim()) { wx.showToast({ title: '请填写收件人', icon: 'none' }); return }
      if (!exchangeForm.phone.trim()) { wx.showToast({ title: '请填写手机号', icon: 'none' }); return }
      if (!exchangeForm.address.trim()) { wx.showToast({ title: '请填写收货地址', icon: 'none' }); return }
    }
    this.setData({ exchanging: true })
    try {
      const data = { productId: exchangeProduct.id }
      if (exchangeProduct.type === 1) {
        data.receiver = exchangeForm.receiver
        data.phone = exchangeForm.phone
        data.address = exchangeForm.address
      }
      const res = await api.exchangeProduct(data)
      wx.showToast({ title: res.msg || '兑换成功', icon: 'success' })
      this.closeExchange()
      this.loadProducts()
      this.loadPoints()
    } catch (e) {}
    this.setData({ exchanging: false })
  },

  goBack() { wx.navigateBack() }
})
