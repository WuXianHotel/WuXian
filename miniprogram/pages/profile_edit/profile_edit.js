// pages/profile_edit/profile_edit.js
const api = require('../../utils/api')
const { uploadToCos } = require('../../utils/cos-upload')
const app = getApp()

// 证件类型枚举：后端存数字（1=身份证 2=护照 3=港澳通行证 4=台湾通行证）
const ID_TYPE_OPTIONS = ['身份证', '护照', '港澳通行证', '台湾通行证']

Page({
  data: {
    form: { nickname: '', gender: 0, realName: '', idType: 1, idNumber: '' },
    avatarUrl: '',
    idTypes: ID_TYPE_OPTIONS,
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
          idType: Number(u.id_type) || 1,
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
      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('[chooseAvatar] 上传失败', err)
      wx.showModal({
        title: '头像上传失败',
        content: (err && err.errMsg) || (err && err.message) || '请稍后重试',
        showCancel: false
      })
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
    // picker 的 value 是索引，我们用 1-based 存数字
    this.setData({ 'form.idType': Number(e.detail.value) + 1 })
  },

  async save() {
    if (this.data.saving) return   // 防重复点击
    const { form, avatarUrl } = this.data
    if (!form.nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' }); return
    }
    // 头像必须是 COS 上传后的 https 地址，本地临时路径（http://tmp/ 或 wxfile://）不能存
    if (avatarUrl && !/^https?:\/\//.test(avatarUrl)) {
      wx.showToast({ title: '头像尚未上传完成，请重试', icon: 'none' }); return
    }
    console.log('[profile_edit.save] 提交', { ...form, avatarUrl })
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...', mask: true })
    try {
      await api.updateProfile({
        nickname: form.nickname,
        gender: form.gender,
        realName: form.realName,
        idType: form.idType,
        idNumber: form.idNumber,
        avatarUrl: avatarUrl || undefined
      })
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      // 乐观更新全局用户信息（立刻同步到 globalData，不阻塞 navigateBack）
      const nextUser = {
        ...(app.globalData.userInfo || {}),
        nickname: form.nickname,
        gender: form.gender,
        real_name: form.realName,
        id_type: form.idType,
        id_number: form.idNumber,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {})
      }
      app.globalData.userInfo = nextUser
      wx.setStorageSync('userInfo', nextUser)
      // 后台异步拉取完整资料兜底（失败也不影响保存结果）
      app.fetchProfile().catch(() => {})
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      wx.hideLoading()
      console.error('[profile_edit.save] 保存失败', e)
      wx.showToast({ title: (e && e.msg) || '保存失败，请重试', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  goBack() { wx.navigateBack() }
})
