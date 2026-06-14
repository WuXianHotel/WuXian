'use strict';
/**
 * 小程序端 · Banner 轮播（公开接口）
 * GET /api/mp/banners  获取启用的 Banner 列表
 */
const router = require('express').Router();
const { query } = require('../../config/db');
const { ok } = require('../../middleware/helper');

router.get('/', async (req, res, next) => {
  try {
    const list = await query(
      'SELECT id, image, title, link_url FROM banners WHERE status = 1 ORDER BY sort_order ASC, id DESC',
    );
    return ok(res, list);
  } catch (err) { next(err); }
});

module.exports = router;
