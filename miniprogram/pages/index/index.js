// pages/index/index.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    checkIn: '',
    checkOut: '',
    checkInLabel: '',
    checkOutLabel: '',
    nights: 1,
    rooms: [],
    loading: true,
    hotelConfig: {},
    banners: [
      { id: 1, tag: '今日特惠', title: '豪华大床房', desc: '入住即送双人早餐，周末特惠' },
      { id: 2, tag: '精品推荐', title: '行政套房', desc: '顶层海景，尊享会员专属折扣' },
      { id: 3, tag: '新品上线', title: '亲子主题房', desc: '儿童设施齐全，家庭出行首选' }
    ],
    showPicker: false,
    pickingStep: 'checkIn', // 'checkIn' | 'checkOut'
    calendarDays: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    tempCheckIn: '',
    tempCheckOut: ''
  },

  onLoad() {
    const today = util.today()
    const tomorrow = util.addDays(today, 1)
    this.setData({
      checkIn: today,
      checkOut: tomorrow,
      checkInLabel: util.formatDate(today),
      checkOutLabel: util.formatDate(tomorrow),
      nights: 1
    })
    this.loadRooms()
    this.loadHotelConfig()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  async loadRooms() {
    this.setData({ loading: true })
    try {
      const res = await api.getRooms({ page: 1, pageSize: 5, checkIn: this.data.checkIn, checkOut: this.data.checkOut })
      this.setData({ rooms: res.data?.list || [] })
    } catch (e) {
      // 静默失败
    } finally {
      this.setData({ loading: false })
    }
  },

  goRooms() {
    wx.switchTab({ url: '/pages/rooms/rooms' })
  },

  goOrders() {
    wx.switchTab({ url: '/pages/orders/orders' })
  },

  goMember() {
    wx.navigateTo({ url: '/pages/member/member' })
  },

  goCoupons() {
    wx.navigateTo({ url: '/pages/member/member?tab=coupons' })
  },

  goRoomDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/room_detail/room_detail?id=${id}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}`
    })
  },

  goBook(e) {
    const id = e.currentTarget.dataset.id
    console.log('ensureLogin')
    app.ensureLogin().then(() => {
      wx.navigateTo({
        url: `/pages/order_create/order_create?roomId=${id}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}`
      })
    }).catch(() => {})
  },

  showDatePicker() {
    const tempCheckIn = this.data.checkIn
    const tempCheckOut = this.data.checkOut
    this.setData({
      showPicker: true,
      pickingStep: 'checkIn',
      tempCheckIn,
      tempCheckOut
    })
    this.buildCalendar()
  },

  closePicker() {
    this.setData({ showPicker: false })
  },

  buildCalendar() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: '', type: 'empty', label: '' })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      date.setHours(0, 0, 0, 0)
      const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      let type = 'normal'
      if (date < today) type = 'past'
      else if (dateStr === this.data.tempCheckIn) type = 'selected'
      else if (dateStr === this.data.tempCheckOut) type = 'selected'
      else if (this.data.tempCheckIn && this.data.tempCheckOut && dateStr > this.data.tempCheckIn && dateStr < this.data.tempCheckOut) type = 'in-range'
      else if (date.getTime() === today.getTime()) type = 'today'
      let label = ''
      if (dateStr === this.data.tempCheckIn) label = '入住'
      if (dateStr === this.data.tempCheckOut) label = '退房'
      days.push({ date: dateStr, day: d, type, label })
    }
    this.setData({ calendarDays: days })
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    const today = util.today()
    if (date < today) return

    if (this.data.pickingStep === 'checkIn') {
      this.setData({ tempCheckIn: date, tempCheckOut: '', pickingStep: 'checkOut' })
    } else {
      if (date <= this.data.tempCheckIn) {
        this.setData({ tempCheckIn: date, tempCheckOut: '', pickingStep: 'checkOut' })
      } else {
        this.setData({ tempCheckOut: date })
      }
    }
    this.buildCalendar()
  },

  confirmDates() {
    const { tempCheckIn, tempCheckOut } = this.data
    if (!tempCheckIn || !tempCheckOut) {
      wx.showToast({ title: '请选择入住和退房日期', icon: 'none' })
      return
    }
    const nights = util.calcNights(tempCheckIn, tempCheckOut)
    this.setData({
      checkIn: tempCheckIn,
      checkOut: tempCheckOut,
      checkInLabel: util.formatDate(tempCheckIn),
      checkOutLabel: util.formatDate(tempCheckOut),
      nights,
      showPicker: false
    })
    this.loadRooms()
  },

  async loadHotelConfig() {
    try {
      const res = await api.getHotelConfig()
      this.setData({ hotelConfig: res.data || {} })
    } catch (e) {}
  },

  navigateToHotel() {
    const c = this.data.hotelConfig
    if (!c.hotel_latitude || !c.hotel_longitude) {
      wx.showToast({ title: '酒店位置未配置', icon: 'none' }); return
    }
    wx.openLocation({
      latitude: Number(c.hotel_latitude),
      longitude: Number(c.hotel_longitude),
      name: c.hotel_name || '酒店',
      address: c.hotel_address || '',
      scale: 16
    })
  },

  callHotel() {
    const phone = this.data.hotelConfig.hotel_phone || '400-000-0000'
    wx.makePhoneCall({ phoneNumber: phone })
  },

  noop() {}
})
