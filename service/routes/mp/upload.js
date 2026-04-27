'use strict';
/**
 * 小程序端 · COS 上传签名 & 图片签名访问
 * POST /api/mp/upload/cos-sign     获取 COS 临时密钥
 * POST /api/mp/upload/sign-urls    批量签名图片 URL
 */
const router = require('express').Router();
const { mpAuth } = require('../../middleware/auth');
const { ok } = require('../../middleware/helper');
const { getTempCredential, signUrls } = require('../../config/cos');

router.post('/cos-sign', mpAuth, async (req, res, next) => {
  try {
    const prefix = req.body.prefix || 'avatars/';
    const data = await getTempCredential(prefix);
    return ok(res, data);
  } catch (err) { next(err); }
});

router.post('/sign-urls', mpAuth, (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls)) return res.status(400).json({ code: 400, msg: 'urls 须为数组' });
  return ok(res, signUrls(urls));
});

module.exports = router;
