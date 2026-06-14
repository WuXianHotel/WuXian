'use strict';
/**
 * 小程序端 · Banner 轮播（公开接口）
 * GET /api/mp/banners  获取启用的 Banner 列表
 */
const router = require('express').Router();
const { query } = require('../../config/db');
const { ok } = require('../../middleware/helper');
const { signUrls } = require('../../config/cos');

router.get('/', async (req, res, next) => {
  try {
    const list = await query(
      'SELECT id, image, title, link_url FROM banners WHERE status = 1 ORDER BY sort_order ASC, id DESC',
    );
    // 签名图片 URL，确保 COS 私有 Bucket 也能访问
    const signed = list.map(item => ({
      ...item,
      image: signUrls([item.image])[0],
    }));
    return ok(res, signed);
  } catch (err) { next(err); }
});

module.exports = router;
