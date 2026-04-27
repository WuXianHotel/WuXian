'use strict';
/**
 * 管理后台 · COS 上传签名 & 图片签名访问
 * POST /api/admin/upload/cos-sign      获取 COS 临时密钥（上传用）
 * POST /api/admin/upload/sign-urls     批量签名图片 URL（访问用）
 */
const router = require('express').Router();
const { adminAuth } = require('../../middleware/auth');
const { ok } = require('../../middleware/helper');
const { getTempCredential, signUrls } = require('../../config/cos');

// ── POST /cos-sign  获取临时密钥 ─────────────────────────────────────────────
router.post('/cos-sign', adminAuth(), async (req, res, next) => {
  try {
    const prefix = req.body.prefix || 'room-images/';
    const data = await getTempCredential(prefix);
    return ok(res, data);
  } catch (err) { next(err); }
});

// ── POST /sign-urls  批量签名图片 URL ────────────────────────────────────────
router.post('/sign-urls', adminAuth(), (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls)) return res.status(400).json({ code: 400, msg: 'urls 须为数组' });
  return ok(res, signUrls(urls));
});

module.exports = router;
