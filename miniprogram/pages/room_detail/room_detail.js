// pages/room_detail/room_detail.js
const api = require('../../utils/api')
const util = require('../../utils/util')

Page({
  data: {
    room: {},
    checkIn: '', checkOut: '', checkInLabel: '', checkOutLabel: '', nights: 1,
    calendarDays: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    reviews: [],
    ratingDist: [
      { star: 5, pct: 85 }, { star: 4, pct: 12 }, { star: 3, pct: 3 }, { star: 2, pct: 0 }
    ],
    pickingStep: 'checkIn',
    loading: true
  },

  onLoad(options) {
    const { id, checkIn, checkOut } = options
    const ci = checkIn || util.today()
    const co = checkOut || util.addDays(ci, 1)
    this.roomId = id
    this.setData({
      checkIn: ci, checkOut: co,
      checkInLabel: util.formatDateWithDay(ci),
      checkOutLabel: util.formatDateWithDay(co),
      nights: util.calcNights(ci, co)
    })
    this.loadRoomDetail()
    this.loadReviews()
  },

  async loadRoomDetail() {
    try {
      const res = await api.getRoomDetail(this.roomId)
      const room = res.data
      // 构造设施列表
      const facilityMap = [
        { key: 'tv', icon: 'icon-desktop', name: '智能电视' },
        { key: 'ac', icon: 'icon-cloud', name: '空调' },
        { key: 'wifi', icon: 'icon-wifi', name: '免费WiFi' },
        { key: 'bathtub', icon: 'icon-experiment', name: '独立浴缸' },
        { key: 'coffee', icon: 'icon-rest', name: '咖啡机' },
        { key: 'toiletries', icon: 'icon-skin', name: '洗漱用品' },
        { key: 'washer', icon: 'icon-sync', name: '洗衣机' },
        { key: 'parking', icon: 'icon-car', name: '免费停车' }
      ]
      room.facilities = facilityMap.filter(f => room[f.key])
      if (!room.facilities.length) {
        room.facilities = facilityMap.slice(0, 6)
      }
      this.setData({ room, loading: false })
      this.buildCalendar()
      wx.setNavigationBarTitle({ title: room.name || '房型详情' })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  async loadReviews() {
    try {
      // mock reviews
      this.setData({
        reviews: [
          { id: 1, avatarEmoji: '', nickname: '王**', date: '2026-04-15', nights: 2, content: '房间很大，设施齐全，服务很好，下次还会来！' },
          { id: 2, avatarEmoji: '', nickname: '李**', date: '2026-04-10', nights: 1, content: '位置绝佳，风景很好，早餐很丰盛，强烈推荐。' }
        ]
      })
    } catch (e) {}
  },

  buildCalendar(priceMap = {}) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: '', type: 'empty' })
    }
    const holidays = ['2026-05-01', '2026-05-02', '2026-05-03']
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      date.setHours(0, 0, 0, 0)
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      let type = 'normal'
      if (date < today) type = 'past'
      else if (dateStr === this.data.checkIn) type = 'selected'
      else if (dateStr === this.data.checkOut) type = 'selected'
      else if (this.data.checkIn && this.data.checkOut && dateStr > this.data.checkIn && dateStr < this.data.checkOut) type = 'in-range'
      else if (date.getTime() === today.getTime()) type = 'today'
      if (holidays.includes(dateStr)) type = (type === 'normal' || type === 'today') ? `${type} holiday` : type

      const price = priceMap[dateStr] || this.data.room.price
      days.push({ date: dateStr, day: d, type, price: date >= today ? price : null })
    }
    this.setData({ calendarDays: days })
  },

  selectCalDate(e) {
    const date = e.currentTarget.dataset.date
    if (!date || date < util.today()) return

    if (this.data.pickingStep === 'checkIn') {
      this.setData({ checkIn: date, checkOut: '', pickingStep: 'checkOut',
        checkInLabel: util.formatDateWithDay(date), checkOutLabel: '' })
    } else {
      if (date <= this.data.checkIn) {
        this.setData({ checkIn: date, checkOut: '', checkInLabel: util.formatDateWithDay(date), checkOutLabel: '', pickingStep: 'checkOut' })
      } else {
        const nights = util.calcNights(this.data.checkIn, date)
        this.setData({ checkOut: date, checkOutLabel: util.formatDateWithDay(date), nights, pickingStep: 'checkIn' })
      }
    }
    this.buildCalendar()
  },

  showMoreDates() { wx.showToast({ title: '暂不支持查看更多', icon: 'none' }) },
  goAllReviews() { wx.showToast({ title: '暂无更多评价', icon: 'none' }) },

  goBook() {
    if (!this.data.checkIn || !this.data.checkOut) {
      wx.showToast({ title: '请先选择入住日期', icon: 'none' }); return
    }
    wx.navigateTo({
      url: `/pages/order_create/order_create?roomId=${this.roomId}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}`
    })
  },

  shareRoom() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] })
  },
  onShareAppMessage() {
    return { title: this.data.room.name || '好房推荐', path: `/pages/room_detail/room_detail?id=${this.roomId}` }
  },

  onHeroImgLoad() { this.setData({ heroImgLoaded: true }) },
  onHeroImgError() { this.setData({ heroImgLoaded: false, 'room.imageUrl': '' }) }
})
