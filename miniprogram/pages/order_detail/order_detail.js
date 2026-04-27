// pages/order_detail/order_detail.js
const api = require('../../utils/api')
const util = require('../../utils/util')

// 后端数字状态 → 前端字符串 key
const STATUS_NUM_TO_KEY = {
  0: 'pending_payment',
  1: 'pending_checkin',
  2: 'checked_in',
  3: 'completed',
  4: 'cancelled',
  5: 'refund_pending'
}

Page({
  data: {
    order: {},
    guests: [],
    checkInDisplay: '', checkOutDisplay: '',
    statusGradient: 'linear-gradient(135deg,#1a56db,#3b82f6)',
    statusHint: '',
    showQRCode: false,
    showActions: false,
    canCancel: false,
    reviewScore: 5,
    reviewContent: '',
    reviewSubmitted: false
  },

  onLoad(options) {
    // id 即 order_no（从列表页传过来）
    this.orderNo = options.id
    this.action = options.action
    this.loadOrder()
  },

  async loadOrder() {
    try {
      const res = await api.getOrderDetail(this.orderNo)
      const raw = res.data

      // 数字状态转字符串
      const statusKey = STATUS_NUM_TO_KEY[raw.status] || String(raw.status)

      // 映射后端 snake_case → 前端 camelCase
      const order = {
        ...raw,
        status: statusKey,
        statusText: util.orderStatusText(statusKey),
        orderNo: raw.order_no,
        roomName: raw.room_name,
        roomId: raw.room_type_id,
        qty: raw.room_count,
        checkIn: raw.check_in_date,
        checkOut: raw.check_out_date,
        finalPrice: raw.pay_amount,
        remark: raw.special_request,
        roomNo: raw.room_no,
        hasReview: raw.has_review || false
      }

      // 解析入住人信息
      let guests = raw.guests_info
      if (typeof guests === 'string') {
        try { guests = JSON.parse(guests) } catch (e) { guests = [] }
      }
      if (!Array.isArray(guests) || guests.length === 0) {
        guests = [{ name: raw.guestName || '-', phone: raw.guestPhone || '' }]
      }
      guests = guests.map(g => ({
        ...g,
        maskedPhone: util.maskPhone(g.phone)
      }))

      let statusGradient = 'linear-gradient(135deg,#1a56db,#3b82f6)'
      let statusHint = ''
      let showQRCode = false
      let showActions = false
      let canCancel = false

      switch (statusKey) {
        case 'pending_payment':
          statusGradient = 'linear-gradient(135deg,#ff9800,#ffc107)'
          statusHint = '请在规定时间内完成支付'
          showActions = false
          canCancel = true
          break
        case 'pending_checkin':
          statusGradient = 'linear-gradient(135deg,#1a56db,#3b82f6)'
          statusHint = `请于 ${util.formatDate(order.checkIn)} 14:00 后办理入住`
          showQRCode = true
          showActions = true
          canCancel = true
          break
        case 'checked_in':
          statusGradient = 'linear-gradient(135deg,#1a56db,#3b82f6)'
          statusHint = `请于 ${util.formatDate(order.checkOut)} 12:00 前退房`
          showQRCode = true
          showActions = true
          break
        case 'completed':
          statusGradient = 'linear-gradient(135deg,#52c41a,#73d13d)'
          statusHint = '感谢您的入住，期待下次再见！'
          showActions = false
          break
        case 'cancelled':
          statusGradient = 'linear-gradient(135deg,#999,#bbb)'
          statusHint = '订单已取消'
          showActions = false
          break
        case 'refund_pending':
          statusGradient = 'linear-gradient(135deg,#ff4d4f,#ff7875)'
          statusHint = '退款处理中，预计1-3工作日到账'
          showActions = false
          break
      }

      this.setData({
        order, guests,
        statusGradient, statusHint, showQRCode, showActions, canCancel,
        checkInDisplay: util.formatDateWithDay(order.checkIn),
        checkOutDisplay: util.formatDateWithDay(order.checkOut)
      })

      wx.setNavigationBarTitle({ title: '订单详情' })
    } catch (e) {}
  },

  setScore(e) {
    this.setData({ reviewScore: e.currentTarget.dataset.score })
  },
  onReviewInput(e) {
    this.setData({ reviewContent: e.detail.value })
  },

  async submitReview() {
    const { reviewScore, reviewContent, order } = this.data
    if (!reviewContent.trim()) {
      wx.showToast({ title: '请填写评价内容', icon: 'none' }); return
    }
    try {
      await api.createReview({
        orderId: this.orderNo,
        roomId: order.roomId,
        score: reviewScore,
        content: reviewContent
      })
      wx.showToast({ title: '评价成功', icon: 'success' })
      this.setData({ reviewSubmitted: true })
    } catch (e) {}
  },

  async cancelOrder() {
    const res = await new Promise(resolve => {
      wx.showModal({ title: '确认取消', content: '取消订单后不可恢复，确认吗？', success: resolve })
    })
    if (!res.confirm) return
    try {
      await api.cancelOrder(this.orderNo)
      wx.showToast({ title: '已提交取消申请', icon: 'success' })
      this.loadOrder()
    } catch (e) {}
  },

  contactFront() {
    wx.makePhoneCall({ phoneNumber: '400-XXX-XXXX' })
  }
})
