// pages/rooms/rooms.js
const api = require('../../utils/api')
const util = require('../../utils/util')

Page({
  data: {
    checkIn: '', checkOut: '', checkInLabel: '', checkOutLabel: '', nights: 1,
    rooms: [], total: 0, page: 1, pageSize: 10, loading: true, loadingMore: false, noMore: false,
    sortBy: 'default',
    activeTag: '',
    priceRange: '',
    bedType: '',
    showFilter: false
  },

  onLoad(options) {
    const checkIn = options.checkIn || util.today()
    const checkOut = options.checkOut || util.addDays(checkIn, 1)
    this.setData({
      checkIn, checkOut,
      checkInLabel: util.formatDate(checkIn),
      checkOutLabel: util.formatDate(checkOut),
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
      if (priceRange) { const [min, max] = priceRange.split('-'); params.priceMin = min; params.priceMax = max }
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
    wx.navigateTo({ url: `/pages/index/index` })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/room_detail/room_detail?id=${id}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}` })
  },
  goBook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/room_detail/room_detail?id=${id}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}` })
  },

  noop() {}
})
