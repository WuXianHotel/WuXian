// pages/rooms/rooms.js
const api = require('../../utils/api')
const util = require('../../utils/util')

const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
function dateMd(s) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
function dateWeek(s) {
  if (!s) return ''
  return WEEK_NAMES[new Date(s).getDay()]
}

Page({
  data: {
    checkIn: '', checkOut: '', checkInLabel: '', checkOutLabel: '', nights: 1,
    rooms: [], total: 0, page: 1, pageSize: 10, loading: true, loadingMore: false, noMore: false,
    sortBy: 'default',
    activeTag: '',
    priceRange: '',
    bedType: '',
    showFilter: false,
    // 日期选择器
    showDatePickerModal: false,
    pickingStep: 'checkIn',
    calendarMonths: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    tempCheckIn: '',
    tempCheckOut: ''
  },

  onLoad(options) {
    // 审核模式：跳回首页
    const app = getApp()
    if (app.globalData.appVersion === '0.0.1') {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    const checkIn = options.checkIn || util.today()
    const checkOut = options.checkOut || util.addDays(checkIn, 1)
    this.setData({
      checkIn, checkOut,
      checkInLabel: util.formatDate(checkIn),
      checkOutLabel: util.formatDate(checkOut),
      checkInMd: dateMd(checkIn),
      checkInWeek: dateWeek(checkIn),
      checkOutMd: dateMd(checkOut),
      checkOutWeek: dateWeek(checkOut),
      nights: util.calcNights(checkIn, checkOut)
    })
    this.loadRooms(true)
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  async loadRooms(reset = false) {
    if (reset) {
      this.setData({ page: 1, rooms: [], noMore: false, loading: true })
    } else {
      this.setData({ loadingMore: true })
    }
    try {
      const { checkIn, checkOut, page, pageSize, sortBy, activeTag, priceRange, bedType } = this.data
      const params = { page, pageSize, checkIn, checkOut, sortBy }
      if (activeTag === 'breakfast') params.breakfast = 1
      if (activeTag === 'refundable') params.refundable = 1
      if (activeTag === 'bigBed') params.bedType = '大床'
      if (activeTag === 'suite') params.type = 'suite'
      if (activeTag === 'smokeFree') params.smokeFree = 1
      if (priceRange) { const [min, max] = priceRange.split('-'); params.minPrice = min; params.maxPrice = max }
      if (bedType) params.bedType = bedType

      const res = await api.getRooms(params)
      const list = res.data?.list || []
      const total = res.data?.total || 0
      this.setData({
        rooms: reset ? list : [...this.data.rooms, ...list],
        total,
        noMore: list.length < pageSize
      })
    } catch (e) {}
    finally { this.setData({ loading: false, loadingMore: false }) }
  },

  loadMore() {
    if (this.data.noMore || this.data.loadingMore) return
    this.setData({ page: this.data.page + 1 }, () => this.loadRooms())
  },

  setSort(e) { this.setData({ sortBy: e.currentTarget.dataset.sort }); this.loadRooms(true) },
  togglePrice() {
    const next = this.data.sortBy === 'price_asc' ? 'price_desc' : 'price_asc'
    this.setData({ sortBy: next }); this.loadRooms(true)
  },
  setTag(e) { this.setData({ activeTag: e.currentTarget.dataset.tag }); this.loadRooms(true) },
  setPriceRange(e) { this.setData({ priceRange: e.currentTarget.dataset.range }) },
  setBedType(e) { this.setData({ bedType: e.currentTarget.dataset.type }) },

  showFilterModal() { this.setData({ showFilter: true }) },
  closeFilter() { this.setData({ showFilter: false }) },
  resetFilter() { this.setData({ priceRange: '', bedType: '' }) },
  applyFilter() { this.setData({ showFilter: false }); this.loadRooms(true) },

  showDatePicker() {
    this.setData({
      showDatePickerModal: true,
      pickingStep: 'checkIn',
      tempCheckIn: this.data.checkIn,
      tempCheckOut: this.data.checkOut
    })
    this.buildCalendar()
  },

  closeDatePicker() {
    this.setData({ showDatePickerModal: false })
  },

  buildCalendar() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { tempCheckIn, tempCheckOut } = this.data

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

    if (date === tempCheckIn) {
      this.setData({ tempCheckIn: '', tempCheckOut: '', pickingStep: 'checkIn' })
      this.buildCalendar()
      return
    }
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
      checkInMd: dateMd(tempCheckIn),
      checkInWeek: dateWeek(tempCheckIn),
      checkOutMd: dateMd(tempCheckOut),
      checkOutWeek: dateWeek(tempCheckOut),
      nights,
      showDatePickerModal: false
    })
    this.loadRooms(true)
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/room_detail/room_detail?id=${id}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}` })
  },
  goBook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/room_detail/room_detail?id=${id}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}` })
  },

  // 图片加载完成：标记为 loaded，触发淡入
  onImgLoad(e) {
    const id = e.currentTarget.dataset.id
    const rooms = this.data.rooms.map(r => r.id === id ? { ...r, imgLoaded: true } : r)
    this.setData({ rooms })
  },

  // 图片加载失败：清空 imageUrl，回退到占位图标
  onImgError(e) {
    const id = e.currentTarget.dataset.id
    const rooms = this.data.rooms.map(r => r.id === id ? { ...r, imageUrl: '', imgLoaded: false } : r)
    this.setData({ rooms })
  },

  noop() {}
})
