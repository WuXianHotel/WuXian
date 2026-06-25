// app.js
// 小程序精简版：仅保留登录鉴权逻辑，UI 全部由 H5 WebView 承载

App({
  globalData: {
    userInfo: null,
    token: '',
    apiBase: 'https://wuxian-hotel.online', // 生产环境域名，开发时可按需修改
    isAudit: false,
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

    // 拉取支付页文案配置 + 审核模式检测
    this.fetchPayText();
    this.globalData._configPromise = this.fetchConfig();

    // 审核模式下跳过登录（符合微信审核规范：不得强制登录才能体验）
    // isAudit 由 fetchConfig 异步设置，login 通过 callback 模式在获取到后再决定
  },

  // 拉取支付页文案（审核/正常模式）
  fetchPayText() {
    wx.request({
      url: `${this.globalData.apiBase}/api/mp/pay/page-text`,
      method: 'GET',
      success: (res) => {
        const body = res.data || {};
        if (body.code === 0 && body.data) {
          this.globalData.payText = body.data;
        }
      },
      fail: (err) => {
        console.warn('[app] 获取支付文案失败:', err);
      },
    });
  },

  // 拉取系统配置，检测审核模式（返回 Promise 供 h5.js await）
  fetchConfig() {
    return new Promise((resolve) => {
      wx.request({
        url: `${this.globalData.apiBase}/api/mp/config`,
        method: 'GET',
        success: (res) => {
          const body = res.data || {};
          const cfg = body.data || {};
          const isAudit = cfg.app_version === '0.0.1';
          this.globalData.isAudit = isAudit;
          console.log('[app] 审核模式:', isAudit);

          // 无论何种模式，都等待静默登录完成再 resolve（确保 token 可用）
          if (!this.globalData.token) {
            // 最多等 5 秒，超时也 resolve（不永久阻塞）
            const timeout = new Promise(r => setTimeout(r, 5000));
            Promise.race([this.login().catch(() => {}), timeout]).finally(resolve);
          } else {
            resolve();
          }
        },
        fail: () => {
          // API 调用失败（无关审核），尝试正常登录流程
          if (!this.globalData.token) {
            this.login().catch(() => {});
          }
          resolve();
        },
      });
    });
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

  // 确保已登录；审核模式下直接放行
  ensureLogin() {
    if (this.globalData.isAudit || this.globalData.token) {
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
