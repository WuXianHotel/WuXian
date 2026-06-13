// app.js
// 小程序精简版：仅保留登录鉴权逻辑，UI 全部由 H5 WebView 承载

App({
  globalData: {
    userInfo: null,
    token: '',
    apiBase: 'https://wuxian-hotel.online', // 生产环境域名，开发时可按需修改
    version: '1.0.0', // 提交审核时改为 '0.0.1' 以隐藏 tabbar/搜索/快捷入口
  },

  onLaunch() {
    console.log('[app] onLaunch 启动');

    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token) {
      this.globalData.token = token;
    }
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }

    // 静默登录：无 token 时自动用 wx.login code 换取 JWT
    if (!token) {
      this.login().catch(() => {});
    }
  },

  // 全局登录（静默登录）
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            console.log('[login] wx.login 成功');
            wx.request({
              url: `${this.globalData.apiBase}/api/mp/auth/login`,
              method: 'POST',
              data: { code: res.code },
              success: (result) => {
                const body = result.data || {};
                const payload = body.data || {};
                if (body.code === 0 && payload.token) {
                  console.log('[login] 登录成功，userId:', payload.userId);
                  this.globalData.token = payload.token;
                  wx.setStorageSync('token', payload.token);
                  this.fetchProfile()
                    .then(profile => resolve(profile))
                    .catch(() => {
                      this.globalData.userInfo = payload;
                      wx.setStorageSync('userInfo', payload);
                      resolve(payload);
                    });
                } else {
                  console.error('[login] 登录失败:', body);
                  reject(body);
                }
              },
              fail: (err) => {
                console.error('[login] 网络请求失败:', err);
                reject(err);
              },
            });
          } else {
            reject(new Error('wx.login failed'));
          }
        },
        fail: reject,
      });
    });
  },

  // 拉取完整用户资料
  fetchProfile() {
    return new Promise((resolve, reject) => {
      const token = this.globalData.token;
      wx.request({
        url: `${this.globalData.apiBase}/api/mp/auth/profile`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        success: (res) => {
          const body = res.data || {};
          if (body.code === 0 && body.data) {
            this.globalData.userInfo = body.data;
            wx.setStorageSync('userInfo', body.data);
            resolve(body.data);
          } else {
            reject(body);
          }
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
  },

  // 确保已登录；未登录时先触发登录再继续
  ensureLogin() {
    if (this.globalData.token) {
      return Promise.resolve();
    }
    wx.showLoading({ title: '登录中...' });
    return this.login()
      .then(() => { wx.hideLoading(); })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
        return Promise.reject(err);
      });
  },
});
