// pages/order_create/order_create.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    room: {},
    checkIn: '', checkOut: '', checkInDisplay: '', checkOutDisplay: '', nights: 1,
    guests: [{ name: '', phone: '' }],
    qty: 1, remark: '',
    totalPrice: 0
  },

  onLoad(options) {
    const { roomId, checkIn, checkOut } = options
    this.roomId = roomId
    const nights = util.calcNights(checkIn, checkOut)
    this.setData({
      checkIn, checkOut, nights,
      checkInDisplay: util.formatDateWithDay(checkIn),
      checkOutDisplay: util.formatDateWithDay(checkOut)
    })
    // 未登录先完成登录再继续加载
    app.ensureLogin().then(() => {
      const userInfo = app.globalData.userInfo
      if (userInfo) {
        this.setData({
          'guests[0].name': userInfo.nickname || '',
          'guests[0].phone': userInfo.phone || ''
        })
      }
      this.loadRoom()
    }).catch(() => {
      wx.navigateBack()
    })
  },

  async loadRoom() {
    try {
      const res = await api.getRoomDetail(this.roomId)
      const room = res.data
      this.setData({ room })
      this.calcTotal()
    } catch (e) {}
  },

  calcTotal() {
    const { room, qty, nights } = this.data
    const total = (room.price || 0) * qty * nights
    this.setData({ totalPrice: total })
  },

  onGuestNameInput(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ [`guests[${idx}].name`]: e.detail.value })
  },
  onGuestPhoneInput(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ [`guests[${idx}].phone`]: e.detail.value })
  },
  addGuest() {
    const guests = this.data.guests
    if (guests.length >= 5) {
      wx.showToast({ title: '最多添加5位入住人', icon: 'none' }); return
    }
    this.setData({ [`guests[${guests.length}]`]: { name: '', phone: '' } })
  },
  removeGuest(e) {
    const idx = e.currentTarget.dataset.idx
    const guests = this.data.guests.filter((_, i) => i !== idx)
    this.setData({ guests })
  },

  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },

  decreaseQty() {
    if (this.data.qty <= 1) return
    this.setData({ qty: this.data.qty - 1 }, this.calcTotal)
  },
  increaseQty() {
    const max = this.data.room.availableRooms || 5
    if (this.data.qty >= max) {
      wx.showToast({ title: `最多可预订${max}间`, icon: 'none' }); return
    }
    this.setData({ qty: this.data.qty + 1 }, this.calcTotal)
  },

  goNext() {
    const { guests, room, checkIn, checkOut, qty, remark, nights, totalPrice } = this.data
    for (let i = 0; i < guests.length; i++) {
      if (!guests[i].name.trim()) {
        wx.showToast({ title: `请填写第${i + 1}位入住人姓名`, icon: 'none' }); return
      }
      if (!guests[i].phone || guests[i].phone.length < 11) {
        wx.showToast({ title: `请填写第${i + 1}位入住人正确的手机号`, icon: 'none' }); return
      }
    }

    const orderData = {
      roomId: this.roomId,
      roomName: room.name,
      roomPrice: room.price,
      imageUrl: room.imageUrl,
      area: room.area,
      bedType: room.bedType,
      view: room.view,
      smokeFree: room.smokeFree,
      breakfast: room.breakfast,
      checkIn, checkOut, nights,
      guests,
      qty, remark,
      totalPrice,
      memberDiscount: room.memberDiscount
    }
    wx.navigateTo({
      url: `/pages/order_confirm/order_confirm?data=${encodeURIComponent(JSON.stringify(orderData))}`
    })
  }
})
