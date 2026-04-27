'use strict';
/**
 * 小程序端 · 积分商城
 * GET  /api/mp/mall/products    商品列表
 * POST /api/mp/mall/exchange    兑换商品
 */
const router = require('express').Router();
const { body } = require('express-validator');
const dayjs    = require('dayjs');
const { v4: uuidv4 } = require('uuid');
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
        'SELECT id, name, description, image, type, points_cost, stock FROM points_products WHERE status = 1 ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?',
        [pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── POST /exchange  兑换 ─────────────────────────────────────────────────────
router.post('/exchange',
  mpAuth,
  body('productId').isInt({ min: 1 }),
  body('address').optional().isString(),
  body('phone').optional().isString(),
  body('receiver').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { productId, address, phone, receiver } = req.body;
      const [product] = await query('SELECT * FROM points_products WHERE id = ? AND status = 1 LIMIT 1', [productId]);
      if (!product) return res.status(404).json({ code: 404, msg: '商品不存在或已下架' });
      if (product.stock <= 0) return res.status(400).json({ code: 400, msg: '库存不足' });

      // 实物商品需要收货信息
      if (product.type === 1 && (!address || !phone || !receiver)) {
        return res.status(400).json({ code: 400, msg: '请填写收货信息' });
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
        await conn.execute('UPDATE points_products SET stock = stock - 1 WHERE id = ?', [productId]);
        // 记录积分流水
        const [[{ bal }]] = await conn.execute('SELECT points AS bal FROM members WHERE user_id = ?', [req.userId]);
        await conn.execute(
          "INSERT INTO points_logs (user_id, type, points, balance, remark) VALUES (?,?,?,?,?)",
          [req.userId, 'use', -product.points_cost, bal, `兑换：${product.name}`],
        );
        // 创建兑换记录
        const [result] = await conn.execute(
          'INSERT INTO points_exchanges (user_id, product_id, points_spent, address, phone, receiver, status) VALUES (?,?,?,?,?,?,?)',
          [req.userId, productId, product.points_cost, address || null, phone || null, receiver || null,
           product.type === 0 ? 1 : 0], // 优惠券直接完成，实物待处理
        );
        exchangeId = result.insertId;

        // type=0 优惠券：自动发放
        if (product.type === 0 && product.coupon_template_id) {
          const [tpl] = await conn.execute('SELECT * FROM coupon_templates WHERE id = ? LIMIT 1', [product.coupon_template_id]);
          if (tpl.length > 0 || tpl[0]) {
            const t = tpl[0] || tpl;
            const expireAt = t.valid_days
              ? dayjs().add(t.valid_days, 'day').format('YYYY-MM-DD')
              : t.end_at;
            const code = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();
            await conn.execute(
              'INSERT INTO user_coupons (user_id, template_id, code, expire_at) VALUES (?,?,?,?)',
              [req.userId, product.coupon_template_id, code, expireAt],
            );
          }
        }
      });

      return ok(res, { exchangeId }, product.type === 0 ? '兑换成功，优惠券已发放' : '兑换成功，请等待发货');
    } catch (err) { next(err); }
  },
);

module.exports = router;
