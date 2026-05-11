'use strict';
/**
 * 管理后台 · 积分商城
 * GET    /api/admin/mall/products          商品列表
 * POST   /api/admin/mall/products          新增商品
 * PUT    /api/admin/mall/products/:id      编辑商品
 * DELETE /api/admin/mall/products/:id      删除商品
 * GET    /api/admin/mall/exchanges         兑换订单列表
 * PATCH  /api/admin/mall/exchanges/:id     处理兑换订单
 */
const router = require('express').Router();
const { body } = require('express-validator');
const { query } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');

// ── GET /products ────────────────────────────────────────────────────────────
router.get('/products', adminAuth(), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const [[{ total }], list] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM points_products'),
      query('SELECT * FROM points_products ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?', [pageSize, offset]),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── POST /products ───────────────────────────────────────────────────────────
router.post('/products',
  adminAuth('super', 'operation'),
  body('name').notEmpty(),
  body('pointsCost').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const f = req.body;
      await query(
        `INSERT INTO points_products (name, description, image, points_cost, stock, sort_order)
         VALUES (?,?,?,?,?,?)`,
        [f.name, f.description || null, f.image || null, f.pointsCost,
         f.stock ?? 999, f.sortOrder || 0],
      );
      return ok(res, null, '商品创建成功');
    } catch (err) { next(err); }
  },
);

// ── PUT /products/:id ────────────────────────────────────────────────────────
router.put('/products/:id', adminAuth('super', 'operation'), async (req, res, next) => {
  try {
    const f = req.body;
    await query(
      `UPDATE points_products SET
        name=COALESCE(?,name), description=COALESCE(?,description), image=COALESCE(?,image),
        points_cost=COALESCE(?,points_cost), stock=COALESCE(?,stock),
        sort_order=COALESCE(?,sort_order), status=COALESCE(?,status)
       WHERE id = ?`,
      [f.name??null, f.description??null, f.image??null, f.pointsCost??null,
       f.stock??null, f.sortOrder??null, f.status??null, req.params.id],
    );
    return ok(res, null, '更新成功');
  } catch (err) { next(err); }
});

// ── DELETE /products/:id ─────────────────────────────────────────────────────
router.delete('/products/:id', adminAuth('super'), async (req, res, next) => {
  try {
    await query('DELETE FROM points_products WHERE id = ?', [req.params.id]);
    return ok(res, null, '删除成功');
  } catch (err) { next(err); }
});

// ── GET /exchanges ───────────────────────────────────────────────────────────
router.get('/exchanges', adminAuth(), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { status } = req.query;
    const cond = []; const params = [];
    if (status !== undefined && status !== '') {
      cond.push('e.status = ?'); params.push(Number(status));
    }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM points_exchanges e ${where}`, params),
      query(
        `SELECT e.*, p.name AS product_name, u.nickname, u.phone AS user_phone
         FROM points_exchanges e
         JOIN points_products p ON p.id = e.product_id
         JOIN users u ON u.id = e.user_id
         ${where}
         ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── PATCH /exchanges/:id  处理兑换 ───────────────────────────────────────────
router.patch('/exchanges/:id',
  adminAuth('super', 'operation'),
  body('status').isIn([1, 2]).withMessage('status 必须为 1(完成) 或 2(取消)'),
  body('remark').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { status, remark } = req.body;
      await query(
        'UPDATE points_exchanges SET status = ?, remark = COALESCE(?, remark) WHERE id = ?',
        [status, remark || null, req.params.id],
      );
      return ok(res, null, status === 1 ? '已标记完成' : '已取消');
    } catch (err) { next(err); }
  },
);

module.exports = router;
