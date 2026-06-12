// API 封装 —— 与小程序 api.js 接口签名完全一致
import { getToken } from './auth.js';

// 生产环境用同源路径（Express 托管），开发环境通过 vite proxy 代理
const API_BASE = '/api/mp';

async function request({ url, method = 'GET', data, silent = false }) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    if (!silent) {
      alert('登录已过期，请重新进入小程序');
    }
    throw new Error('401');
  }

  const result = await res.json();

  if (result.code === 0) {
    return result;
  }

  const msg = result.errors?.[0]?.msg || result.msg || '请求失败';
  if (!silent) {
    alert(msg);
  }
  throw Object.assign(new Error(msg), { code: result.code, data: result });
}

function clearToken() {
  localStorage.removeItem('hotel_h5_token');
}

// 与小程序 api.js 保持完全一致的接口
const api = {
  // ─── 认证 ───
  getProfile: () => request({ url: '/auth/profile' }),
  updateProfile: (data) => request({ url: '/auth/profile', method: 'PUT', data }),

  // ─── 房型 ───
  getRooms: (params) => request({ url: '/rooms', data: params }),
  getRoomDetail: (id) => request({ url: `/rooms/${id}` }),
  getRoomCalendar: (id, params) => request({ url: `/rooms/${id}/calendar`, data: params }),

  // ─── 订单 ───
  createOrder: (data) => request({ url: '/orders', method: 'POST', data }),
  getOrders: (params) => request({ url: '/orders', data: params }),
  getOrderDetail: (id) => request({ url: `/orders/${id}` }),
  cancelOrder: (id) => request({ url: `/orders/${id}/cancel`, method: 'POST' }),
  requestRefund: (id, data) => request({ url: `/orders/${id}/refund`, method: 'POST', data }),

  // ─── 支付 ───
  walletPay: (orderNo) => request({ url: '/pay/wallet', method: 'POST', data: { orderNo } }),

  // ─── 会员 ───
  getMemberInfo: () => request({ url: '/member/info' }),
  getPointsHistory: (params) => request({ url: '/member/points', data: params }),
  getMemberLevels: () => request({ url: '/member/levels' }),

  // ─── 钱包 ───
  getWalletInfo: () => request({ url: '/wallet/info' }),
  getWalletLogs: (params) => request({ url: '/wallet/logs', data: params }),

  // ─── 积分商城 ───
  getMallProducts: (params) => request({ url: '/mall/products', data: params }),
  getExchangeRecords: (params) => request({ url: '/mall/exchanges', data: params }),
  exchangeProduct: (data) => request({ url: '/mall/exchange', method: 'POST', data }),

  // ─── 积分抵扣 ───
  getDeductInfo: () => request({ url: '/member/deduct-info' }),

  // ─── 评价 ───
  createReview: (data) => request({ url: '/reviews', method: 'POST', data }),

  // ─── 公开配置 ───
  getHotelConfig: () => request({ url: '/config' }),
};

export default api;
