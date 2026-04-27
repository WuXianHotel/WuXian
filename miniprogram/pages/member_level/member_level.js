// pages/member_level/member_level.js
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    memberInfo: {},
    levels: [],
    currentLevel: 0
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      const [infoRes, levelsRes] = await Promise.all([
        api.getMemberInfo(),
        api.getMemberLevels()
      ])
      const info = infoRes.data || {}
      const levels = levelsRes.data || []
      console.log(levelsRes.data)
      this.setData({
        memberInfo: info,
        currentLevel: info.level || 1,
        levels
      })
    } catch (e) {}
  }
})
