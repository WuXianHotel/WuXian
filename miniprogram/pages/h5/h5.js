// pages/h5/h5.js
// 小程序唯一页面：登录鉴权 → 将 token + 路由信息传入 WebView
const app = getApp();

Page({
  data: {
    webviewUrl: '',
    loading: true,
    errorMsg: '',
  },

  onLoad(options) {
    // 保存小程序入口路径信息（如从分享链接进入 room_detail 等）
    // options 可能包含: id, checkIn, checkOut 等
    this.entryOptions = options;
    this.initAuth();
  },

  onShow() {
    // 从支付中转页返回时，将支付结果以 URL hash 形式注入到 H5，让 H5 感知
    const app = getApp();
    const result = app.globalData && app.globalData.lastPayResult;
    if (result && !result.consumed) {
      result.consumed = true;
      const cur = this.data.webviewUrl;
      if (cur) {
        // 用 hash 携带结果，H5 端通过 hashchange 监听；带时间戳保证唯一
        const hash = `#payResult=${result.result}&orderNo=${encodeURIComponent(result.orderNo || '')}&ts=${result.ts}`;
        // 移除旧 hash 后追加新 hash，触发 web-view 重新加载并通知 H5
        const base = cur.split('#')[0];
        this.setData({ webviewUrl: base + hash });
      }
    }
  },

  async initAuth() {
    this.setData({ loading: true, errorMsg: '' });

    try {
      const token = app.globalData.token;
      const isAudit = app.globalData.isAudit;

      // 审核模式：直接加载 H5，不强制登录
      if (isAudit) {
        const apiBase = app.globalData.apiBase;
        const webviewUrl = `${apiBase}/h5/?audit=1`;
        console.log('[h5] 审核模式，跳过鉴权:', webviewUrl);
        this.setData({ webviewUrl, loading: false });
        return;
      }

      // 正常模式：确保已登录
      await app.ensureLogin();

      if (!token) {
        this.setData({ errorMsg: '登录失败，请重试', loading: false });
        return;
      }

      // 构造 H5 URL，携带 token 和原始路由信息
      const webviewUrl = this.buildUrl(app.globalData.apiBase, token);
      console.log('[h5] webview URL:', webviewUrl);

      this.setData({ webviewUrl, loading: false });
    } catch (err) {
      console.error('[h5] 初始化鉴权失败:', err);
      this.setData({ errorMsg: '初始化失败，请重新进入', loading: false });
    }
  },

  // 根据小程序入口构造 H5 地址（history 路由模式，无 #）
  buildUrl(apiBase, token) {
    // H5 SPA 地址（history 模式，base: /h5/）
    const baseUrl = `${apiBase}/h5/`;

    // 构造 H5 内的路由 path
    let h5Path = '';
    const opts = this.entryOptions || {};
    const scene = opts.scene || '';

    if (scene) {
      h5Path = this.parseScene(scene);
    }

    // 默认首页
    if (!h5Path || h5Path === '/') {
      // 首页：/h5/?token=xxx
      return `${baseUrl}?token=${encodeURIComponent(token)}`;
    }

    // 子页面：/h5/rooms?token=xxx
    // 去掉 h5Path 开头的 /
    const path = h5Path.replace(/^\//, '');
    return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
  },

  // 解析小程序 scene 参数到 H5 路由
  parseScene(scene) {
    // scene 是解码后的 query string: "roomDetail?id=1&checkIn=2026-01-01"
    try {
      const [path, query] = scene.split('?');
      const params = {};
      if (query) {
        query.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          params[k] = decodeURIComponent(v || '');
        });
      }

      // 映射小程序路径 → H5 路由
      const routeMap = {
        roomDetail: `/room/${params.id || ''}`,
        orderDetail: `/order/${params.id || ''}`,
        rooms: '/rooms',
        home: '/',
      };

      const basePath = routeMap[path];
      if (!basePath) return '/';

      // 将 query 参数拼接到 H5 路由
      const queryStr = Object.entries(params)
        .filter(([k]) => k !== 'id') // id 已在路径中
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');

      return queryStr ? `${basePath}?${queryStr}` : basePath;
    } catch {
      return '/';
    }
  },

  // WebView 加载完成
  onWebviewLoad() {
    console.log('[h5] WebView 加载完成');
  },

  // WebView 加载错误
  onWebviewError(e) {
    console.error('[h5] WebView 加载失败:', e);
    this.setData({ errorMsg: '页面加载失败，请检查网络', loading: false });
  },

  // WebView 向小程序发消息（H5 可通过 wx.miniProgram.postMessage 通信）
  // 此处预留：H5 可能需要调用小程序 API（如选择图片、获取位置等）
  onWebviewMessage(e) {
    const data = e.detail?.data?.[e.detail.data.length - 1];
    if (!data) return;

    console.log('[h5] WebView 消息:', data);

    switch (data.action) {
      case 'navigateBack':
        wx.navigateBack({ delta: 1 });
        break;
      case 'reAuth':
        // H5 请求重新授权（token 过期等场景）
        app.globalData.token = '';
        wx.removeStorageSync('token');
        this.initAuth();
        break;
      case 'openLocation':
        // H5 请求打开位置导航
        if (data.latitude && data.longitude) {
          wx.openLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            name: data.name || '柳州无限电竞酒店',
            address: data.address || '',
            scale: 16,
          });
        }
        break;
      case 'makePhoneCall':
        // H5 请求拨打电话
        if (data.phoneNumber) {
          wx.makePhoneCall({ phoneNumber: data.phoneNumber });
        }
        break;
      // 注意：requestPayment 不再通过 postMessage 触发——
      // postMessage 只在页面退出/分享时才送达，无法实时拉起支付。
      // H5 端改为 wx.miniProgram.navigateTo('/pages/test/test?p=...') 走支付中转页。
      default:
        break;
    }
  },

  // 页面分享
  onShareAppMessage() {
    // WebView 页面，分享由 H5 内部处理
    return {
      title: '柳州无限电竞酒店',
      path: '/pages/h5/h5',
    };
  },
});
