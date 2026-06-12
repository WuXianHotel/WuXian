// pages/index/index.js
const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    appVersion: '',      // 服务端版本号，'0.0.1' 为审核模式
    versionReady: false, // 版本号加载完成标记
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
    calendarMonths: [],
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
    // 轮询等待 app 获取版本号完成（app.onLaunch 和页 onLoad 并发执行）
    this._waitVersionAndInit()
  },

  // 等待 app.globalData.versionReady 后初始化页面
  _waitVersionAndInit() {
    if (app.globalData.versionReady) {
      this._initWithVersion()
      return
    }
    // 轮询等待，最多等 5 秒
    let retries = 0
    const check = () => {
      if (app.globalData.versionReady) {
        this._initWithVersion()
        return
      }
      if (++retries > 50) {
        // 超时，按审核模式初始化
        this.setData({ versionReady: true, appVersion: '0.0.1' })
        this.loadHotelConfig()
        return
      }
      setTimeout(check, 100)
    }
    setTimeout(check, 100)
  },

  _initWithVersion() {
    const version = app.globalData.appVersion || '0.0.1'
    this.setData({ versionReady: true, appVersion: version })
    // if (version !== '0.0.1') {
    this.loadRooms()
    // }
    this.loadHotelConfig()
  },

  onShow() {
    if (app.globalData.versionReady) {
      this.setData({ appVersion: app.globalData.appVersion || '' })
    }
    // 同步自定义 tabBar 选中状态
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
    if (app.globalData.appVersion === '0.0.1') return
    wx.switchTab({ url: '/pages/rooms/rooms' })
  },

  goOrders() {
    if (app.globalData.appVersion === '0.0.1') return
    wx.switchTab({ url: '/pages/orders/orders' })
  },

  goMember() {
    if (app.globalData.appVersion === '0.0.1') return
    wx.navigateTo({ url: '/pages/member/member' })
  },

  goRoomDetail(e) {
    if (app.globalData.appVersion === '0.0.1') return
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/room_detail/room_detail?id=${id}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}`
    })
  },

  goBook(e) {
    if (app.globalData.appVersion === '0.0.1') return
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
    const { tempCheckIn, tempCheckOut } = this.data

    // 构建最近 3 个月的日历（当前月 + 后续 2 个月）
    const MONTHS_TO_SHOW = 3
    const baseYear = today.getFullYear()
    const baseMonth = today.getMonth()
    const months = []

    for (let offset = 0; offset < MONTHS_TO_SHOW; offset++) {
      const year = baseYear + Math.floor((baseMonth + offset) / 12)
      const month = (baseMonth + offset) % 12
      const firstDay = new Date(year, month, 1).getDay()
      const daysInMonth = new Date(year, month + 1, 0).getDate()

      const days = []
      // 补齐月初空位
      for (let i = 0; i < firstDay; i++) {
        days.push({ date: '', day: '', type: 'empty', label: '' })
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d)
        date.setHours(0, 0, 0, 0)
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        let type = 'normal'
        if (date < today) type = 'past'
        else if (dateStr === tempCheckIn) type = 'selected'
        else if (dateStr === tempCheckOut) type = 'selected'
        else if (tempCheckIn && tempCheckOut && dateStr > tempCheckIn && dateStr < tempCheckOut) type = 'in-range'
        else if (date.getTime() === today.getTime()) type = 'today'
        let label = ''
        if (dateStr === tempCheckIn) label = '入住'
        if (dateStr === tempCheckOut) label = '退房'
        days.push({ date: dateStr, day: d, type, label })
      }
      months.push({
        key: `${year}-${month}`,
        year,
        month: month + 1,
        title: `${year}年${month + 1}月`,
        days
      })
    }
    this.setData({ calendarMonths: months })
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    const today = util.today()
    if (date < today) return

    const { tempCheckIn, tempCheckOut } = this.data

    // 再次点击已选中的入住日期：清空入住和退房，重新选择入住
    if (date === tempCheckIn) {
      this.setData({ tempCheckIn: '', tempCheckOut: '', pickingStep: 'checkIn' })
      this.buildCalendar()
      return
    }
    // 再次点击已选中的退房日期：只清空退房，回到选择退房步骤
    if (date === tempCheckOut) {
      this.setData({ tempCheckOut: '', pickingStep: 'checkOut' })
      this.buildCalendar()
      return
    }

    if (this.data.pickingStep === 'checkIn') {
      this.setData({ tempCheckIn: date, tempCheckOut: '', pickingStep: 'checkOut' })
    } else {
      if (date <= tempCheckIn) {
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

  onImgLoad(e) {
    const id = e.currentTarget.dataset.id
    const rooms = this.data.rooms.map(r => r.id === id ? { ...r, imgLoaded: true } : r)
    this.setData({ rooms })
  },
  onImgError(e) {
    const id = e.currentTarget.dataset.id
    const rooms = this.data.rooms.map(r => r.id === id ? { ...r, imageUrl: '', imgLoaded: false } : r)
    this.setData({ rooms })
  },

  noop() {}
})
