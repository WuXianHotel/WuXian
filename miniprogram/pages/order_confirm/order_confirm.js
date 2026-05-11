// pages/order_confirm/order_confirm.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    order: {},
    guests: [],
    checkInDisplay: '', checkOutDisplay: '',
    roomTotal: 0, discountAmount: 0, finalPrice: 0,
    paying: false,
    // 积分抵扣
    deductInfo: null,
    usePointsDeduct: false,
    pointsDeductAmount: 0,
    // 余额
    walletBalance: 0,
    balanceEnough: false
  },

  onLoad(options) {
    const order = JSON.parse(decodeURIComponent(options.data))
    const price = Number(order.roomPrice) || 0
    const qty   = Number(order.qty) || 1
    const nights= Number(order.nights) || 1
    const roomTotal = price * qty * nights

    // 兼容：支持新版 guests 数组和旧版 guestName/guestPhone
    let guests = order.guests
    if (!guests || !guests.length) {
      guests = [{ name: order.guestName || '', phone: order.guestPhone || '' }]
    }
    guests = guests.map(g => ({
      ...g,
      maskedPhone: util.maskPhone(g.phone)
    }))

    this.setData({
      order, guests,
      checkInDisplay: util.formatDateWithDay(order.checkIn),
      checkOutDisplay: util.formatDateWithDay(order.checkOut),
      roomTotal
    })
    this.calcPrice()
    this.loadDeductInfo()
    this.loadWalletBalance()
  },

  async loadWalletBalance() {
    try {
      const res = await api.getWalletInfo()
      const balance = res.data?.balance || 0
      this.setData({ walletBalance: balance })
      this.checkBalance()
    } catch (e) {}
  },

  checkBalance() {
    const { walletBalance, finalPrice } = this.data
    this.setData({ balanceEnough: walletBalance >= finalPrice })
  },

  async loadDeductInfo() {
    try {
      const res = await api.getDeductInfo()
      this.setData({ deductInfo: res.data || null })
    } catch (e) {}
  },

  calcPrice() {
    const { order, roomTotal, usePointsDeduct, deductInfo } = this.data
    let discount = 0
    if (order.memberDiscount) {
      discount = Math.round(roomTotal * (1 - order.memberDiscount / 10))
    }
    let afterDiscount = Math.max(0, roomTotal - discount)
    // 积分抵扣
    let pointsDeductAmount = 0
    if (usePointsDeduct && deductInfo && deductInfo.enabled) {
      pointsDeductAmount = Math.min(deductInfo.maxDeduct, afterDiscount)
    }
    const final = Math.max(0, afterDiscount - pointsDeductAmount)
    this.setData({ discountAmount: discount, pointsDeductAmount, finalPrice: final })
    this.checkBalance()
  },

  togglePointsDeduct() {
    this.setData({ usePointsDeduct: !this.data.usePointsDeduct }, this.calcPrice)
  },

  async doPay() {
    if (this.data.paying) return

    if (!this.data.balanceEnough) {
      wx.showToast({ title: '余额不足，请先充值', icon: 'none' })
      return
    }

    this.setData({ paying: true })

    // 确保已登录
    if (!app.globalData.token) {
      try { await app.login() } catch (e) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        this.setData({ paying: false }); return
      }
    }

    try {
      const { order, finalPrice, usePointsDeduct, deductInfo, pointsDeductAmount } = this.data
      // 计算实际使用的积分数
      const usePoints = (usePointsDeduct && deductInfo) ? Math.ceil(pointsDeductAmount * deductInfo.rate) : 0
      // 1. 创建订单
      const createRes = await api.createOrder({
        roomId: order.roomId,
        checkIn: order.checkIn,
        checkOut: order.checkOut,
        guestsInfo: this.data.guests.map(g => ({ name: g.name, phone: g.phone })),
        qty: order.qty,
        remark: order.remark,
        usePoints
      })
      const orderNo = createRes.data?.orderNo

      // 2. 余额支付
      await api.walletPay(orderNo)

      wx.showToast({ title: '支付成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/order_detail/order_detail?id=${orderNo}` })
      }, 600)
    } catch (e) {
      wx.showToast({ title: e?.msg || '支付失败', icon: 'none' })
    } finally {
      this.setData({ paying: false })
    }
  },

  noop() {}
})
