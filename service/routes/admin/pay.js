'use strict';
/**
 * 管理后台 · 支付管理
 * GET  /api/admin/pay/list          支付记录列表
 * GET  /api/admin/pay/:orderNo      订单支付详情
 */
const router = require('express').Router();
const { query } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { parsePager, ok, page } = require('../../middleware/helper');

router.get('/list', adminAuth('super', 'finance'), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { orderNo, status, startDate, endDate } = req.query;
    const cond = []; const params = [];
    if (orderNo)  { cond.push('p.order_no LIKE ?'); params.push(`%${orderNo}%`); }
    if (status !== undefined && status !== '') { cond.push('p.status = ?'); params.push(Number(status)); }
    if (startDate){ cond.push('DATE(p.created_at) >= ?'); params.push(startDate); }
    if (endDate)  { cond.push('DATE(p.created_at) <= ?'); params.push(endDate); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM payments p ${where}`, params),
      query(
        `SELECT p.*, u.nickname, u.phone FROM payments p
         JOIN users u ON u.id = p.user_id
         ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

router.get('/:orderNo', adminAuth('super', 'finance'), async (req, res, next) => {
  try {
    const [pay] = await query(
      'SELECT * FROM payments WHERE order_no = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.orderNo],
    );
    return ok(res, pay || null);
  } catch (err) { next(err); }
});

module.exports = router;
