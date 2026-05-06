'use strict';
/**
 * 小程序端 · COS 上传签名 & 图片签名访问
 * POST /api/mp/upload/cos-sign      获取 COS 临时密钥（兼容老接口）
 * POST /api/mp/upload/put-sign      获取 PUT 预签名 URL（推荐小程序用）
 * POST /api/mp/upload/sign-urls     批量签名图片 URL
 */
const router = require('express').Router();
const { mpAuth } = require('../../middleware/auth');
const { ok } = require('../../middleware/helper');
const { getTempCredential, getPutSignedUrl, signUrls } = require('../../config/cos');

router.post('/cos-sign', mpAuth, async (req, res, next) => {
  try {
    const prefix = req.body.prefix || 'avatars/';
    const data = await getTempCredential(prefix);
    return ok(res, data);
  } catch (err) { next(err); }
});

// 直接返回预签名 PUT URL，小程序端用 wx.uploadFile 直传，无需前端签名
router.post('/put-sign', mpAuth, (req, res) => {
  const prefix = req.body.prefix || 'avatars/';
  const ext = (req.body.ext || 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'jpg';
  const key = `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return ok(res, getPutSignedUrl(key));
});

router.post('/sign-urls', mpAuth, (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls)) return res.status(400).json({ code: 400, msg: 'urls 须为数组' });
  return ok(res, signUrls(urls));
});

module.exports = router;
