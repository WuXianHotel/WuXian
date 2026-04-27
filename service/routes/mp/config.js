'use strict';
/**
 * 小程序端 · 公开配置
 * GET /api/mp/config  酒店公开信息（名称、地址、电话、经纬度等）
 */
const router = require('express').Router();
const { query } = require('../../config/db');
const { ok } = require('../../middleware/helper');

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      "SELECT `key`, `value`, `type` FROM settings WHERE `group` = 'hotel'"
    );
    const config = {};
    for (const r of rows) {
      config[r.key] = r.type === 'number' ? Number(r.value) : r.value;
    }
    return ok(res, config);
  } catch (err) { next(err); }
});

module.exports = router;
