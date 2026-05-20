// utils/api.js

function request(options) {
  const app = getApp()
  const apiBase = (app && app.globalData && app.globalData.apiBase) || ''

  return new Promise((resolve, reject) => {
    const token = (app && app.globalData.token) || wx.getStorageSync('token')
    const header = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }

    const fullUrl = `${apiBase}${options.url}`
    console.log('[api] request:', fullUrl)   // 方便排查

    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data,
      header,
      success(res) {
        if (res.statusCode === 401) {
          // Token 失效，清除并提示登录
          app.globalData.token = ''
          wx.removeStorageSync('token')
          wx.showToast({ title: '请先登录', icon: 'none' })
          reject(res.data)
          return
        }
        if (res.data && res.data.code === 0) {
          resolve(res.data)
        } else {
          // 优先展示字段级错误（express-validator 的 errors[0].msg），更精确
          const fieldMsg = res.data?.errors?.[0]?.msg
          const msg = fieldMsg || res.data?.msg || '请求失败'
          // options.silent: 调用方自己 toast 时，跳过 api 层 toast
          if (!options.silent) {
            wx.showToast({ title: msg, icon: 'none' })
          }
          // 把规范化的错误塞回去，方便调用方判断
          reject(Object.assign({}, res.data, { _msg: msg }))
        }
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      }
    })
  })
}

const api = {
  // ─── 认证 ───
  login: (data) => request({ url: '/api/mp/auth/login', method: 'POST', data }),
  getProfile: () => request({ url: '/api/mp/auth/profile' }),
  updateProfile: (data) => request({ url: '/api/mp/auth/profile', method: 'PUT', data }),
  bindPhone: (data) => request({ url: '/api/mp/auth/bind-phone', method: 'POST', data }),

  // ─── 房型 ───
  getRooms: (params) => request({ url: '/api/mp/rooms', data: params }),
  getRoomDetail: (id) => request({ url: `/api/mp/rooms/${id}` }),
  getRoomCalendar: (id, params) => request({ url: `/api/mp/rooms/${id}/calendar`, data: params }),

  // ─── 订单 ───
  createOrder: (data) => request({ url: '/api/mp/orders', method: 'POST', data }),
  getOrders: (params) => request({ url: '/api/mp/orders', data: params }),
  getOrderDetail: (id) => request({ url: `/api/mp/orders/${id}` }),
  cancelOrder: (id) => request({ url: `/api/mp/orders/${id}/cancel`, method: 'POST' }),
  requestRefund: (id, data) => request({ url: `/api/mp/orders/${id}/refund`, method: 'POST', data }),

  // ─── 支付 ───
  createPayment: (orderId) => request({ url: '/api/mp/pay/create', method: 'POST', data: { orderId } }),
  walletPay: (orderNo) => request({ url: '/api/mp/pay/wallet', method: 'POST', data: { orderNo } }),
  mockPaid: (orderNo) => request({ url: '/api/mp/pay/mock-paid', method: 'POST', data: { orderNo } }),
  paymentNotify: () => request({ url: '/api/mp/pay/notify', method: 'POST' }),

  // ─── 会员 ───
  getMemberInfo: () => request({ url: '/api/mp/member/info' }),
  getPointsHistory: (params) => request({ url: '/api/mp/member/points', data: params }),
  getMemberLevels: () => request({ url: '/api/mp/member/levels' }),

  // ─── 评价 ───
  createReview: (data) => request({ url: '/api/mp/reviews', method: 'POST', data }),

  // ─── 公开配置 ───
  getHotelConfig: () => request({ url: '/api/mp/config' }),

  // ─── 钱包 ───
  getWalletInfo: () => request({ url: '/api/mp/wallet/info' }),
  getWalletLogs: (params) => request({ url: '/api/mp/wallet/logs', data: params }),
  recharge: (data) => request({ url: '/api/mp/wallet/recharge', method: 'POST', data }),

  // ─── 积分商城 ───
  getMallProducts: (params) => request({ url: '/api/mp/mall/products', data: params }),
  exchangeProduct: (data) => request({ url: '/api/mp/mall/exchange', method: 'POST', data }),

  // ─── 积分抵扣 ───
  getDeductInfo: () => request({ url: '/api/mp/member/deduct-info' }),

  // ─── COS 上传 ───
  getCosSign: (prefix) => request({ url: '/api/mp/upload/cos-sign', method: 'POST', data: { prefix: prefix || 'avatars/' } }),
  getPutSign: (data) => request({ url: '/api/mp/upload/put-sign', method: 'POST', data }),
}

module.exports = api
