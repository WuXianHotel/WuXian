// pages/orders/orders.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

// 后端数字状态 → 前端字符串 key
// 对应数据库 schema：0待支付 1待入住 2入住中 3已退房 4已取消 5退款中 6已退款
const STATUS_NUM_TO_KEY = {
  0: 'pending_payment',
  1: 'pending_checkin',
  2: 'checked_in',
  3: 'completed',
  4: 'cancelled',
  5: 'refund_pending',
  6: 'refunded'
}

Page({
  data: {
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending_payment', label: '待支付' },
      { key: 'pending_checkin', label: '待入住' },
      { key: 'checked_in', label: '入住中' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' },
      { key: 'refund_pending', label: '退款中' },
      { key: 'refunded', label: '已退款' }
    ],
    activeTab: 'all',
    orders: [], page: 1, pageSize: 10,
    loading: false, noMore: false
  },

  onLoad(options) {
    const app = getApp()
    if (app.globalData.appVersion === '0.0.1') {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    if (options.tab) this.setData({ activeTab: options.tab })
    this.loadOrders(true)
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    app.ensureLogin().then(() => {
      this.loadOrders(true)
    }).catch(() => {})
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ activeTab: key })
    this.loadOrders(true)
  },

  async loadOrders(reset = false) {
    if (!app.globalData.token) {
      this.setData({ orders: [], loading: false }); return
    }
    if (reset) this.setData({ page: 1, orders: [], noMore: false, loading: true })

    try {
      const { activeTab, page, pageSize } = this.data
      const params = { page, pageSize }
      if (activeTab !== 'all') params.status = activeTab

      const res = await api.getOrders(params)
      const list = (res.data?.list || []).map(o => {
        // 后端 status 是数字，转成字符串 key
        const statusKey = STATUS_NUM_TO_KEY[o.status] || String(o.status)
        // 解析房型图片（后端存的是 JSON 字符串）
        let imageUrl = ''
        try {
          const images = typeof o.room_images === 'string' ? JSON.parse(o.room_images) : o.room_images
          imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : ''
        } catch (e) { imageUrl = '' }
        // 解析入住人
        let guestName = ''
        if (o.guests_info) {
          try {
            const guests = typeof o.guests_info === 'string' ? JSON.parse(o.guests_info) : o.guests_info
            guestName = Array.isArray(guests) && guests.length > 0 ? guests[0].name : ''
          } catch (e) {}
        }

        return {
          ...o,
          id: o.order_no,
          orderNo: o.order_no,
          status: statusKey,
          statusText: util.orderStatusText(statusKey),
          statusColor: util.orderStatusColor(statusKey),
          roomName: o.room_name,
          imageUrl,
          qty: o.room_count,
          finalPrice: o.pay_amount,
          guestName,
          checkInLabel: util.formatDate(o.check_in_date),
          checkOutLabel: util.formatDate(o.check_out_date)
        }
      })
      this.setData({
        orders: reset ? list : [...this.data.orders, ...list],
        noMore: list.length < pageSize
      })
    } catch (e) {}
    finally { this.setData({ loading: false }) }
  },

  loadMore() {
    if (this.data.noMore) return
    this.setData({ page: this.data.page + 1 }, () => this.loadOrders())
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/order_detail/order_detail?id=${e.currentTarget.dataset.id}` })
  },

  goPay(e) {
    wx.navigateTo({ url: `/pages/order_detail/order_detail?id=${e.currentTarget.dataset.id}&action=pay` })
  },

  async cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    const res = await new Promise(resolve => {
      wx.showModal({ title: '确认取消', content: '确定要取消这个订单吗？', success: resolve })
    })
    if (!res.confirm) return
    try {
      await api.cancelOrder(id)
      wx.showToast({ title: '已取消', icon: 'success' })
      this.loadOrders(true)
    } catch (e) {}
  },

  goReview(e) {
    wx.navigateTo({ url: `/pages/order_detail/order_detail?id=${e.currentTarget.dataset.id}&action=review` })
  },

  viewInvoice(e) {
    wx.showToast({ title: '发票功能开发中', icon: 'none' })
  },

  onImgLoad(e) {
    const id = e.currentTarget.dataset.id
    const orders = this.data.orders.map(o => o.id === id ? { ...o, imgLoaded: true } : o)
    this.setData({ orders })
  },
  onImgError(e) {
    const id = e.currentTarget.dataset.id
    const orders = this.data.orders.map(o => o.id === id ? { ...o, imageUrl: '', imgLoaded: false } : o)
    this.setData({ orders })
  }
})
