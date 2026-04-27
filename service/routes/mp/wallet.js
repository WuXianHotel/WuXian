'use strict';
/**
 * 小程序端 · 钱包
 * GET  /api/mp/wallet/info      余额信息
 * GET  /api/mp/wallet/logs      流水列表
 * POST /api/mp/wallet/recharge  充值（mock 模式直接到账）
 */
const router = require('express').Router();
const { body } = require('express-validator');
const { query, transaction } = require('../../config/db');
const { mpAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');

// ── GET /info ────────────────────────────────────────────────────────────────
router.get('/info', mpAuth, async (req, res, next) => {
  try {
    const [user] = await query('SELECT wallet_balance FROM users WHERE id = ? LIMIT 1', [req.userId]);
    return ok(res, { balance: user ? Number(user.wallet_balance) : 0 });
  } catch (err) { next(err); }
});

// ── GET /logs  流水列表 ──────────────────────────────────────────────────────
router.get('/logs', mpAuth, async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const [[{ total }], list] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM wallet_logs WHERE user_id = ?', [req.userId]),
      query(
        'SELECT id, type, amount, balance, remark, created_at FROM wallet_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [req.userId, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── POST /recharge  充值 ─────────────────────────────────────────────────────
router.post('/recharge',
  mpAuth,
  body('amount').isFloat({ min: 1 }).withMessage('充值金额至少1元'),
  validate,
  async (req, res, next) => {
    try {
      const amount = parseFloat(Number(req.body.amount).toFixed(2));
      let newBalance;
      await transaction(async conn => {
        // 锁定用户行
        const [[user]] = await conn.execute(
          'SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE', [req.userId]
        );
        newBalance = parseFloat((Number(user.wallet_balance) + amount).toFixed(2));
        await conn.execute('UPDATE users SET wallet_balance = ? WHERE id = ?', [newBalance, req.userId]);
        await conn.execute(
          'INSERT INTO wallet_logs (user_id, type, amount, balance, remark) VALUES (?,?,?,?,?)',
          [req.userId, 'recharge', amount, newBalance, `充值 ¥${amount}`],
        );
      });
      return ok(res, { balance: newBalance }, '充值成功');
    } catch (err) { next(err); }
  },
);

module.exports = router;
