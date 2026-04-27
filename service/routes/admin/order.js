'use strict';
/**
 * 管理后台 · 订单管理
 * GET   /api/admin/orders           订单列表（筛选+分页）
 * GET   /api/admin/orders/stats     各状态数量统计
 * GET   /api/admin/orders/:orderNo  订单详情
 * PATCH /api/admin/orders/:orderNo/checkin   办理入住
 * PATCH /api/admin/orders/:orderNo/checkout  办理退房
 * PATCH /api/admin/orders/:orderNo/cancel    后台取消订单
 * GET   /api/admin/orders/:orderNo/refund    退款详情
 * PATCH /api/admin/orders/:orderNo/refund    审核退款
 */
const router = require('express').Router();
const { body } = require('express-validator');
const { query, transaction } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');

// ── GET /stats ────────────────────────────────────────────────────────────────
router.get('/stats', adminAuth(), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT status, COUNT(*) AS cnt FROM orders
       WHERE DATE(created_at) = CURDATE()
       GROUP BY status`,
    );
    const map = Object.fromEntries(rows.map(r => [r.status, r.cnt]));
    const total = rows.reduce((s, r) => s + r.cnt, 0);

    // 当前入住中的房间数（不限今日）
    const [{ checkin }] = await query(
      "SELECT COUNT(*) AS checkin FROM orders WHERE status = 2"
    );
    // 今日收入（已支付订单）
    const [{ revenue }] = await query(
      "SELECT COALESCE(SUM(pay_amount), 0) AS revenue FROM orders WHERE DATE(created_at) = CURDATE() AND pay_status = 1"
    );

    return ok(res, {
      total,
      today: total,
      checkin,
      revenue,
      pending_pay:    map[0] || 0,
      pending_checkin:map[1] || 0,
      checking_in:    map[2] || 0,
      checked_out:    map[3] || 0,
      cancelled:      map[4] || 0,
      refunding:      map[5] || 0,
      refunded:       map[6] || 0,
    });
  } catch (err) { next(err); }
});

// ── GET /  订单列表 ───────────────────────────────────────────────────────────
router.get('/', adminAuth(), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { orderNo, phone, roomTypeId, status, startDate, endDate } = req.query;
    const cond = []; const params = [];

    if (orderNo)    { cond.push('o.order_no LIKE ?');            params.push(`%${orderNo}%`); }
    if (roomTypeId) { cond.push('o.room_type_id = ?');           params.push(Number(roomTypeId)); }
    if (status !== undefined && status !== '') {
                      cond.push('o.status = ?');                 params.push(Number(status)); }
    if (startDate)  { cond.push('o.check_in_date >= ?');         params.push(startDate); }
    if (endDate)    { cond.push('o.check_in_date <= ?');         params.push(endDate); }
    if (phone) {
      cond.push('EXISTS(SELECT 1 FROM users u WHERE u.id = o.user_id AND u.phone = ?)');
      params.push(phone);
    }

    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params),
      query(
        `SELECT o.order_no, o.check_in_date, o.check_out_date, o.nights, o.room_count,
                o.pay_amount, o.status, o.pay_status, o.created_at, o.guests_info,
                rt.name AS room_name,
                u.nickname, u.phone,
                r.room_no
         FROM orders o
         JOIN room_types rt ON rt.id = o.room_type_id
         JOIN users u       ON u.id  = o.user_id
         LEFT JOIN rooms r  ON r.id  = o.room_id
         ${where}
         ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    // 解析 guests_info 并生成 guest_display
    list.forEach(o => {
      let guests = o.guests_info;
      if (typeof guests === 'string') {
        try { guests = JSON.parse(guests); } catch { guests = []; }
      }
      if (!Array.isArray(guests)) guests = [];
      o.guests_info = guests;
      if (guests.length > 1) {
        o.guest_display = `${guests[0].name} 等${guests.length}人`;
      } else if (guests.length === 1) {
        o.guest_display = guests[0].name;
      } else {
        o.guest_display = o.nickname || '-';
      }
    });
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /:orderNo  订单详情 ───────────────────────────────────────────────────
router.get('/:orderNo', adminAuth(), async (req, res, next) => {
  try {
    const [order] = await query(
      `SELECT o.*, rt.name AS room_name, rt.images AS room_images,
               r.room_no, u.nickname, u.phone, u.real_name
       FROM orders o
       JOIN room_types rt ON rt.id = o.room_type_id
       JOIN users u       ON u.id  = o.user_id
       LEFT JOIN rooms r  ON r.id  = o.room_id
       WHERE o.order_no = ? LIMIT 1`,
      [req.params.orderNo],
    );
    if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
    // 解析 guests_info JSON
    if (typeof order.guests_info === 'string') {
      try { order.guests_info = JSON.parse(order.guests_info); } catch { order.guests_info = []; }
    }
    if (!Array.isArray(order.guests_info)) order.guests_info = [];
    return ok(res, order);
  } catch (err) { next(err); }
});

// ── PATCH /:orderNo/checkin  办理入住 ─────────────────────────────────────────
router.patch('/:orderNo/checkin',
  adminAuth('super', 'front_desk'),
  body('roomId').isInt({ min: 1 }).withMessage('请分配具体房间'),
  body('deposit').optional().isFloat({ min: 0 }),
  validate,
  async (req, res, next) => {
    try {
      const { roomId, deposit } = req.body;
      const [order] = await query(
        'SELECT id, status FROM orders WHERE order_no = ? LIMIT 1',
        [req.params.orderNo],
      );
      if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
      if (order.status !== 1) return res.status(400).json({ code: 400, msg: '订单状态不正确，无法入住' });

      await transaction(async conn => {
        await conn.execute(
          'UPDATE orders SET status = 2, room_id = ?, deposit = ?, check_in_at = NOW() WHERE order_no = ?',
          [roomId, deposit ?? null, req.params.orderNo],
        );
        await conn.execute('UPDATE rooms SET status = 1 WHERE id = ?', [roomId]);
      });
      return ok(res, null, '入住办理成功');
    } catch (err) { next(err); }
  },
);

// ── PATCH /:orderNo/checkout  办理退房 ───────────────────────────────────────
router.patch('/:orderNo/checkout',
  adminAuth('super', 'front_desk'),
  async (req, res, next) => {
    try {
      const [order] = await query(
        'SELECT id, status, room_id FROM orders WHERE order_no = ? LIMIT 1',
        [req.params.orderNo],
      );
      if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
      if (order.status !== 2) return res.status(400).json({ code: 400, msg: '订单状态不正确，无法退房' });

      await transaction(async conn => {
        await conn.execute(
          'UPDATE orders SET status = 3, check_out_at = NOW() WHERE order_no = ?',
          [req.params.orderNo],
        );
        if (order.room_id) {
          // 将房间置为清洁状态
          await conn.execute('UPDATE rooms SET status = 4 WHERE id = ?', [order.room_id]);
        }
        // 更新会员累计入住晚数（如果支付回调没更新到）
        await conn.execute(
          `UPDATE members m
           JOIN orders o ON o.user_id = m.user_id
           SET m.total_nights = m.total_nights + 0  -- 已在支付回调中更新，此处可补偿
           WHERE o.order_no = ?`,
          [req.params.orderNo],
        );
      });
      return ok(res, null, '退房办理成功');
    } catch (err) { next(err); }
  },
);

// ── PATCH /:orderNo/cancel  后台取消 ──────────────────────────────────────────
router.patch('/:orderNo/cancel',
  adminAuth('super', 'front_desk'),
  body('reason').notEmpty().withMessage('取消原因不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const [order] = await query(
        'SELECT id, status, pay_status FROM orders WHERE order_no = ? LIMIT 1',
        [req.params.orderNo],
      );
      if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
      if (![0, 1].includes(order.status)) return res.status(400).json({ code: 400, msg: '当前状态不可取消' });
      const newStatus = order.pay_status === 1 ? 5 : 4;
      await query(
        'UPDATE orders SET status = ?, cancel_reason = ?, cancel_at = NOW() WHERE order_no = ?',
        [newStatus, req.body.reason, req.params.orderNo],
      );
      return ok(res, null, '订单已取消');
    } catch (err) { next(err); }
  },
);

// ── GET /:orderNo/refund ──────────────────────────────────────────────────────
router.get('/:orderNo/refund', adminAuth(), async (req, res, next) => {
  try {
    const [refund] = await query(
      'SELECT * FROM refunds WHERE order_no = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.orderNo],
    );
    return ok(res, refund || null);
  } catch (err) { next(err); }
});

// ── PATCH /:orderNo/refund  审核退款 ──────────────────────────────────────────
router.patch('/:orderNo/refund',
  adminAuth('super', 'finance'),
  body('action').isIn(['approve', 'reject']).withMessage('action 必须为 approve 或 reject'),
  body('remark').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { action, remark } = req.body;
      const [refund] = await query(
        'SELECT * FROM refunds WHERE order_no = ? AND status = 0 ORDER BY created_at DESC LIMIT 1',
        [req.params.orderNo],
      );
      if (!refund) return res.status(404).json({ code: 404, msg: '退款申请不存在或已处理' });

      if (action === 'reject') {
        await transaction(async conn => {
          await conn.execute(
            'UPDATE refunds SET status = 4, auditor_id = ?, audit_remark = ?, audit_at = NOW() WHERE id = ?',
            [req.adminId, remark || null, refund.id],
          );
          await conn.execute('UPDATE orders SET status = 3 WHERE order_no = ?', [req.params.orderNo]);
        });
        return ok(res, null, '退款申请已拒绝');
      }

      // 审核通过 → 状态置为退款中（后续调用微信退款接口）
      await transaction(async conn => {
        await conn.execute(
          'UPDATE refunds SET status = 1, auditor_id = ?, audit_remark = ?, audit_at = NOW() WHERE id = ?',
          [req.adminId, remark || null, refund.id],
        );
        await conn.execute('UPDATE orders SET status = 5 WHERE order_no = ?', [req.params.orderNo]);
        // TODO: 调用微信退款 API，成功后将 refunds.status 改为 3，orders.status 改为 6
      });
      return ok(res, null, '审核通过，退款处理中');
    } catch (err) { next(err); }
  },
);

module.exports = router;
