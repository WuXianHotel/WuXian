// pages/profile_edit/profile_edit.js
const api = require('../../utils/api')
const { uploadToCos } = require('../../utils/cos-upload')
const app = getApp()

Page({
  data: {
    form: { nickname: '', gender: 0, realName: '', idType: '身份证', idNumber: '' },
    avatarUrl: '',
    idTypes: ['身份证', '护照', '港澳通行证', '台湾通行证'],
    saving: false
  },

  onLoad() {
    this.loadProfile()
  },

  async loadProfile() {
    try {
      const res = await api.getProfile()
      const u = res.data || {}
      this.setData({
        avatarUrl: u.avatar_url || '',
        form: {
          nickname: u.nickname || '',
          gender: u.gender || 0,
          realName: u.real_name || '',
          idType: u.id_type || '身份证',
          idNumber: u.id_number || ''
        }
      })
    } catch (e) {}
  },

  // 微信头像授权回调 — 先上传到 COS 再暂存 URL
  async onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl
    if (!tempPath) return
    wx.showLoading({ title: '上传中...' })
    try {
      const cosUrl = await uploadToCos(tempPath, 'avatars/')
      this.setData({ avatarUrl: cosUrl })
    } catch (err) {
      wx.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onGenderChange(e) {
    this.setData({ 'form.gender': Number(e.detail.value) })
  },

  onIdTypeChange(e) {
    this.setData({ 'form.idType': this.data.idTypes[e.detail.value] })
  },

  async save() {
    const { form, avatarUrl } = this.data
    if (!form.nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' }); return
    }
    this.setData({ saving: true })
    try {
      await api.updateProfile({
        nickname: form.nickname,
        gender: form.gender,
        realName: form.realName,
        idType: form.idType,
        idNumber: form.idNumber,
        avatarUrl: avatarUrl || undefined
      })
      // 同步更新全局用户信息
      await app.fetchProfile()
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      wx.showToast({ title: e?.msg || '保存失败', icon: 'none' })
    }
    this.setData({ saving: false })
  },

  goBack() { wx.navigateBack() }
})
