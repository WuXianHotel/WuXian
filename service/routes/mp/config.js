'use strict';
/**
 * 小程序端 · 公开配置
 * GET /api/mp/config  酒店公开信息（名称、地址、电话、经纬度等）+ 系统版本控制
 */
const router = require('express').Router();
const { query } = require('../../config/db');
const { ok } = require('../../middleware/helper');

router.get('/', async (req, res, next) => {
  try {
    const [hotelRows, systemRows] = await Promise.all([
      query("SELECT `key`, `value`, `type` FROM settings WHERE `group` = 'hotel'"),
      query("SELECT `key`, `value`, `type` FROM settings WHERE `group` = 'system' AND `key` = 'app_version'"),
    ]);

    const config = {};
    for (const r of hotelRows) {
      config[r.key] = r.type === 'number' ? Number(r.value) : r.value;
    }

    // 系统版本控制：默认 '0.0.1' 为审核模式（仅展示位置信息，隐藏预订功能）
    if (systemRows.length > 0) {
      config.app_version = systemRows[0].value;
    } else {
      config.app_version = '0.0.1';
    }

    return ok(res, config);
  } catch (err) { next(err); }
});

module.exports = router;
