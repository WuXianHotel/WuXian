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
const { refundsApply, isAvailable: wxPayAvailable } = require('../../config/wechatpay');
const logger = require('../../config/logger');
const { adminAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');

// ── GET /stats ────────────────────────────────────────────────────────────────
router.get('/stats', adminAuth(), async (req, res, next) => {
  try {
    // 各状态订单总数（全量，不限今日）
    const rows = await query(
      `SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status`,
    );
    const map = Object.fromEntries(rows.map(r => [r.status, r.cnt]));
    const total = rows.reduce((s, r) => s + r.cnt, 0);

    // 今日新建订单数
    const [{ today }] = await query(
      "SELECT COUNT(*) AS today FROM orders WHERE DATE(created_at) = CURDATE()"
    );
    // 当前入住中的房间数
    const [{ checkin }] = await query(
      "SELECT COUNT(*) AS checkin FROM orders WHERE status = 2"
    );
    // 今日收入（已支付订单）
    const [{ revenue }] = await query(
      "SELECT COALESCE(SUM(pay_amount), 0) AS revenue FROM orders WHERE DATE(created_at) = CURDATE() AND pay_status = 1"
    );

    return ok(res, {
      total,
      today,
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
      // 只要退款单未走到终态（3已退款 / 4已拒绝）都允许处理
      const [refund] = await query(
        'SELECT * FROM refunds WHERE order_no = ? AND status IN (0, 1, 2) ORDER BY created_at DESC LIMIT 1',
        [req.params.orderNo],
      );
      if (!refund) return res.status(404).json({ code: 404, msg: '退款申请不存在或已处理' });

      if (action === 'reject') {
        await transaction(async conn => {
          await conn.execute(
            'UPDATE refunds SET status = 4, auditor_id = ?, audit_remark = ?, audit_at = NOW() WHERE id = ?',
            [req.adminId, remark || null, refund.id],
          );
          // 拒绝退款 → 订单回到"待入住"状态（原已付款待入住）
          await conn.execute('UPDATE orders SET status = 1 WHERE order_no = ?', [req.params.orderNo]);
        });
        return ok(res, null, '退款申请已拒绝');
      }

      // 审核通过 → 完成退款
      // 业务逻辑：
      //   1) 微信支付订单：调用微信退款 API 原路退回
      //   2) 余额支付订单：退款金额回退到用户钱包余额
      //   3) 扣除/退还本单积分变更
      const [payment] = await query(
        'SELECT method, transaction_id, amount FROM payments WHERE order_no = ? AND status = 1 LIMIT 1',
        [req.params.orderNo],
      );
      const isWechatPay = payment && payment.method === 'wechat';

      // 微信支付订单：先调用微信退款 API
      let wxRefundId = null;
      if (isWechatPay) {
        if (!wxPayAvailable) {
          return res.status(501).json({ code: 501, msg: '微信支付未配置，无法原路退款' });
        }
        try {
          // 金额单位：元 → 分
          const refundFen = Math.round(Number(refund.amount) * 100);
          const totalFen = Math.round(Number(payment.amount) * 100);
          const result = await refundsApply({
            outTradeNo: req.params.orderNo,
            outRefundNo: refund.refund_no,
            refund: refundFen,
            total: totalFen,
            reason: remark || '用户申请退款',
          });
          wxRefundId = result.refund_id || result.out_refund_no || '';
          logger.info(`[refund] 微信退款成功 orderNo=${req.params.orderNo} wxRefundId=${wxRefundId}`);
        } catch (err) {
          logger.error(`[refund] 微信退款失败 orderNo=${req.params.orderNo} msg=${err.message}`);
          return res.status(502).json({ code: 502, msg: `微信退款失败: ${err.message}` });
        }
      }

      await transaction(async conn => {
        // (1) 更新退款单、订单状态
        await conn.execute(
          'UPDATE refunds SET status = 3, auditor_id = ?, audit_remark = ?, audit_at = NOW(), refund_at = NOW()' +
          (wxRefundId ? ', wx_refund_id = ?' : '') + ' WHERE id = ?',
          wxRefundId ? [req.adminId, remark || null, wxRefundId, refund.id] : [req.adminId, remark || null, refund.id],
        );
        await conn.execute('UPDATE orders SET status = 6 WHERE order_no = ?', [req.params.orderNo]);

        // (2) 余额退款仅对余额支付订单（微信支付已原路退回，不重复回钱包）
        if (!isWechatPay) {
          await conn.execute(
            'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
            [refund.amount, refund.user_id],
          );
          const [[user]] = await conn.execute(
            'SELECT wallet_balance FROM users WHERE id = ? LIMIT 1',
            [refund.user_id],
          );
          await conn.execute(
            'INSERT INTO wallet_logs (user_id, type, amount, balance, remark, ref_order_no) VALUES (?, ?, ?, ?, ?, ?)',
            [refund.user_id, 'refund', refund.amount, user.wallet_balance, '订单退款', req.params.orderNo],
          );
        }

        // (3) 计算本单积分变动：earn 正数累加（奖励）、use 负数累加（抵扣）
        const [pointsRows] = await conn.execute(
          "SELECT type, SUM(points) AS sum FROM points_logs WHERE ref_id = ? AND type IN ('earn','use') GROUP BY type",
          [req.params.orderNo],
        );
        let earnedPoints = 0; // 本单奖励过多少积分
        let usedPoints = 0;   // 本单抵扣过多少积分（会是负数）
        for (const r of pointsRows) {
          if (r.type === 'earn') earnedPoints = Number(r.sum) || 0;
          if (r.type === 'use')  usedPoints = Number(r.sum) || 0; // 负数
        }

        // 扣除本单奖励的积分
        if (earnedPoints > 0) {
          await conn.execute(
            'UPDATE members SET points = GREATEST(points - ?, 0), points_total = GREATEST(points_total - ?, 0) WHERE user_id = ?',
            [earnedPoints, earnedPoints, refund.user_id],
          );
          const [[m1]] = await conn.execute('SELECT points AS bal FROM members WHERE user_id = ? LIMIT 1', [refund.user_id]);
          await conn.execute(
            "INSERT INTO points_logs (user_id, type, points, balance, remark, ref_id) VALUES (?, 'adjust', ?, ?, ?, ?)",
            [refund.user_id, -earnedPoints, m1 ? m1.bal : 0, `订单退款扣回奖励积分`, req.params.orderNo],
          );
        }

        // 退还本单抵扣的积分（usedPoints 是负数，退还为正数）
        if (usedPoints < 0) {
          const refundPoints = -usedPoints;
          await conn.execute(
            'UPDATE members SET points = points + ? WHERE user_id = ?',
            [refundPoints, refund.user_id],
          );
          const [[m2]] = await conn.execute('SELECT points AS bal FROM members WHERE user_id = ? LIMIT 1', [refund.user_id]);
          await conn.execute(
            "INSERT INTO points_logs (user_id, type, points, balance, remark, ref_id) VALUES (?, 'adjust', ?, ?, ?, ?)",
            [refund.user_id, refundPoints, m2 ? m2.bal : 0, `订单退款返还抵扣积分`, req.params.orderNo],
          );
        }
      });
      const msg = isWechatPay ? '退款审核通过，已原路退回' : '退款审核通过，金额已退回会员余额';
      return ok(res, null, msg);
    } catch (err) { next(err); }
  },
);

module.exports = router;
