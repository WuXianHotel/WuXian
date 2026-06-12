// 鉴权工具
// 流程: 小程序登录 → 拿到 JWT token → 以 ?token=xxx 传入 WebView → H5 保存 → 所有 API 请求带 Authorization Bearer

const TOKEN_KEY = 'hotel_h5_token';
const USER_KEY = 'hotel_h5_user';

export function getToken() {
  // 1. 优先从 URL query string 取（小程序传入: /h5/?token=xxx#/）
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  if (urlToken) {
    localStorage.setItem(TOKEN_KEY, urlToken);
    // 清理 URL 中的 token 参数，保留 pathname + hash
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    return urlToken;
  }

  // 2. 兼容旧格式：token 在 hash 中（#/路由?token=xxx）
  const hash = window.location.hash;
  if (hash && hash.includes('token=')) {
    const hashParams = new URLSearchParams(hash.split('?')[1] || '');
    const hashToken = hashParams.get('token');
    if (hashToken) {
      localStorage.setItem(TOKEN_KEY, hashToken);
      // 清理 hash 中的 token，保留路由路径
      const cleanHash = hash.split('?')[0];
      const url = new URL(window.location.href);
      url.hash = cleanHash;
      window.history.replaceState({}, '', url.toString());
      return hashToken;
    }
  }

  // 3. 从 localStorage 取（后续页面跳转时）
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
