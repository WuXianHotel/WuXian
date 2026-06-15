'use strict';
/**
 * 本地文件存储配置（替代腾讯云 COS）
 * 上传目录: /opt/hotel/service/uploads/
 * 访问 URL: https://wuxian-hotel.online/uploads/
 */
const path = require('path');

const BASE_URL = process.env.UPLOAD_BASE_URL || 'https://wuxian-hotel.online';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

/**
 * 批量转换图片 URL 为本地访问路径
 * - 已有 COS URL（含 myqcloud.com）→ 提取 key → 转为本地路径
 * - 已有本地路径（/uploads/ 开头）→ 直接返回
 * - 相对路径 → 直接返回
 */
function signUrls(urls) {
  return (urls || []).map(url => {
    if (!url) return url;
    // 已是本地路径
    if (url.startsWith('/uploads/')) return url;
    // 已是完整本地 URL
    if (url.startsWith(BASE_URL + '/uploads/')) return url;
    // COS URL → 提取 key 转为本地路径
    if (url.includes('myqcloud.com') || url.includes('cos.')) {
      const clean = url.split('?')[0];
      try {
        const u = new URL(clean);
        const key = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
        return `/uploads/${key}`;
      } catch {
        // URL 解析失败，尝试直接从路径提取
        const parts = clean.split('/');
        const idx = parts.findIndex(p => p.includes('uploads') || p === 'room-images' || p === 'banners' || p === 'icons');
        if (idx >= 0) {
          return '/uploads/' + parts.slice(idx).join('/');
        }
      }
    }
    return url;
  });
}

module.exports = { UPLOAD_DIR, signUrls };
