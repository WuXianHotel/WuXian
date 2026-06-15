'use strict';
/**
 * 小程序端 · 图片签名访问
 * POST /api/mp/upload/sign-urls     批量转换图片 URL 为本地路径
 */
const router = require('express').Router();
const { mpAuth } = require('../../middleware/auth');
const { ok } = require('../../middleware/helper');
const { signUrls } = require('../../config/cos');

router.post('/sign-urls', mpAuth, (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls)) return res.status(400).json({ code: 400, msg: 'urls 须为数组' });
  return ok(res, signUrls(urls));
});

module.exports = router;
