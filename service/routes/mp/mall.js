'use strict';
/**
 * 小程序端 · 积分商城（仅实物兑换）
 * GET  /api/mp/mall/products    商品列表
 * GET  /api/mp/mall/exchanges   兑换记录
 * POST /api/mp/mall/exchange    兑换商品
 */
const router = require('express').Router();
const { body } = require('express-validator');
const { query, transaction } = require('../../config/db');
const { mpAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');

// ── GET /products ────────────────────────────────────────────────────────────
router.get('/products', mpAuth, async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const [[{ total }], list] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM points_products WHERE status = 1'),
      query(
        'SELECT id, name, description, image, points_cost, stock, type FROM points_products WHERE status = 1 ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?',
        [pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /exchanges  兑换记录 ───────────────────────────────────────────────────
router.get('/exchanges', mpAuth, async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const [[{ total }], list] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM points_exchanges WHERE user_id = ?', [req.userId]),
      query(
        `SELECT e.id, e.points_spent, e.status, e.address, e.phone, e.receiver, e.remark, e.created_at,
                p.name AS product_name, p.image AS product_image
         FROM points_exchanges e
         LEFT JOIN points_products p ON p.id = e.product_id
         WHERE e.user_id = ?
         ORDER BY e.created_at DESC
         LIMIT ? OFFSET ?`,
        [req.userId, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── POST /exchange  兑换 ─────────────────────────────────────────────────────
router.post('/exchange',
  mpAuth,
  body('productId').isInt({ min: 1 }),
  body('address').optional(),
  body('phone').optional(),
  body('receiver').optional(),
  validate,
  async (req, res, next) => {
    try {
      const { productId, address, phone, receiver } = req.body;
      const [product] = await query('SELECT * FROM points_products WHERE id = ? AND status = 1 LIMIT 1', [productId]);
      if (!product) return res.status(404).json({ code: 404, msg: '商品不存在或已下架' });
      if (product.stock <= 0) return res.status(400).json({ code: 400, msg: '库存不足' });

      // 实物商品需要收货信息
      if (product.type === 1) {
        if (!receiver?.trim()) return res.status(400).json({ code: 400, msg: '请填写收货人' });
        if (!phone?.trim()) return res.status(400).json({ code: 400, msg: '请填写联系电话' });
        if (!address?.trim()) return res.status(400).json({ code: 400, msg: '请填写收货地址' });
      }

      const [member] = await query('SELECT points FROM members WHERE user_id = ? LIMIT 1', [req.userId]);
      if (!member || member.points < product.points_cost) {
        return res.status(400).json({ code: 400, msg: '积分不足' });
      }

      let exchangeId;
      await transaction(async conn => {
        // 扣积分
        await conn.execute('UPDATE members SET points = points - ? WHERE user_id = ?', [product.points_cost, req.userId]);
        // 减库存
        await conn.execute('UPDATE points_products SET stock = stock - 1 WHERE id = ? AND stock > 0', [productId]);
        // 记录积分流水
        const [[{ bal }]] = await conn.execute('SELECT points AS bal FROM members WHERE user_id = ?', [req.userId]);
        await conn.execute(
          "INSERT INTO points_logs (user_id, type, points, balance, remark) VALUES (?,?,?,?,?)",
          [req.userId, 'use', -product.points_cost, bal, `兑换：${product.name}`],
        );
        // 创建兑换记录（实物：待处理）
        const [result] = await conn.execute(
          'INSERT INTO points_exchanges (user_id, product_id, points_spent, address, phone, receiver, status) VALUES (?,?,?,?,?,?,0)',
          [req.userId, productId, product.points_cost, address || null, phone || null, receiver || null],
        );
        exchangeId = result.insertId;
      });

      return ok(res, { exchangeId }, '兑换成功，请等待发货');
    } catch (err) {
      console.error('[mall] exchange error:', err.message, err.stack);
      next(err);
    }
  },
);

module.exports = router;
