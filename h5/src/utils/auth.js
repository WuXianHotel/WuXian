// 鉴权工具
// 流程: 小程序登录 → 拿到 JWT token → 以 ?token=xxx 传入 WebView → H5 保存 → 所有 API 请求带 Authorization Bearer

const TOKEN_KEY = 'hotel_h5_token';
const USER_KEY = 'hotel_h5_user';

export function getToken() {
  // 1. 优先从 URL 参数取（小程序刚传进来时）
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  if (urlToken) {
    localStorage.setItem(TOKEN_KEY, urlToken);
    // 清理 URL 中的 token，避免泄露到浏览器历史/分享
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
    return urlToken;
  }
  // 2. 从 localStorage 取（后续页面跳转时）
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUserInfo() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUserInfo(info) {
  localStorage.setItem(USER_KEY, JSON.stringify(info));
}
