'use strict';
/**
 * 小程序端 · 优惠券
 * GET  /api/mp/coupons/available  可用优惠券列表（下单时选择）
 * POST /api/mp/coupons/claim/:id  领取优惠券
 */
const router = require('express').Router();
const dayjs  = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../../config/db');
const { mpAuth } = require('../../middleware/auth');
const { ok } = require('../../middleware/helper');

// ── GET /available ────────────────────────────────────────────────────────────
router.get('/available', mpAuth, async (req, res, next) => {
  try {
    const { amount } = req.query; // 订单金额，用于过滤不满足条件的券
    const coupons = await query(
      `SELECT uc.id, uc.expire_at, ct.name, ct.type, ct.value, ct.min_amount
       FROM user_coupons uc
       JOIN coupon_templates ct ON ct.id = uc.template_id
       WHERE uc.user_id = ? AND uc.status = 0 AND uc.expire_at >= CURDATE()
         ${amount ? 'AND ct.min_amount <= ?' : ''}
       ORDER BY uc.expire_at ASC`,
      amount ? [req.userId, Number(amount)] : [req.userId],
    );
    return ok(res, coupons);
  } catch (err) { next(err); }
});

// ── POST /claim/:id  领取优惠券 ───────────────────────────────────────────────
router.post('/claim/:id', mpAuth, async (req, res, next) => {
  try {
    const templateId = Number(req.params.id);
    const [tpl] = await query(
      'SELECT * FROM coupon_templates WHERE id = ? AND status = 1 LIMIT 1',
      [templateId],
    );
    if (!tpl) return res.status(404).json({ code: 404, msg: '优惠券不存在' });
    if (tpl.total_count !== -1 && tpl.issued_count >= tpl.total_count) {
      return res.status(400).json({ code: 400, msg: '优惠券已领完' });
    }

    // 每人限领
    const [{ cnt }] = await query(
      'SELECT COUNT(*) AS cnt FROM user_coupons WHERE user_id = ? AND template_id = ?',
      [req.userId, templateId],
    );
    if (cnt >= tpl.per_limit) {
      return res.status(400).json({ code: 400, msg: `每人限领 ${tpl.per_limit} 张` });
    }

    const expireAt = tpl.valid_days
      ? dayjs().add(tpl.valid_days, 'day').format('YYYY-MM-DD')
      : tpl.end_at;

    await transaction(async conn => {
      const code = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();
      await conn.execute(
        'INSERT INTO user_coupons (user_id, template_id, code, expire_at) VALUES (?,?,?,?)',
        [req.userId, templateId, code, expireAt],
      );
      await conn.execute(
        'UPDATE coupon_templates SET issued_count = issued_count + 1 WHERE id = ?',
        [templateId],
      );
    });
    return ok(res, null, '领取成功');
  } catch (err) { next(err); }
});

module.exports = router;
