'use strict';
/**
 * 小程序端 · 订单
 * POST /api/mp/orders           创建订单（下单）
 * GET  /api/mp/orders           我的订单列表
 * GET  /api/mp/orders/:orderNo  订单详情
 * POST /api/mp/orders/:orderNo/cancel 取消订单
 * POST /api/mp/orders/:orderNo/refund 申请退款
 */
const router  = require('express').Router();
const { body } = require('express-validator');
const dayjs   = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../../config/db');
const { mpAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');
const { signUrls } = require('../../config/cos');

// ── 生成订单号 ────────────────────────────────────────────────────────────────
function genOrderNo() {
  return 'HT' + dayjs().format('YYYYMMDDHHmmss') + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
}

// ── POST /  创建订单 ──────────────────────────────────────────────────────────
router.post('/',
  mpAuth,
  // 字段归一化：兼容前端使用的 roomId/checkIn/checkOut/qty/guestName/guestPhone/remark
  (req, _res, next) => {
    const b = req.body || {};
    if (b.roomTypeId    == null && b.roomId     != null) b.roomTypeId    = Number(b.roomId);
    if (b.checkInDate   == null && b.checkIn    != null) b.checkInDate   = b.checkIn;
    if (b.checkOutDate  == null && b.checkOut   != null) b.checkOutDate  = b.checkOut;
    if (b.roomCount     == null && b.qty        != null) b.roomCount     = Number(b.qty);
    if (b.specialRequest== null && b.remark     != null) b.specialRequest= b.remark;
    // 把 guestName/guestPhone 合成 guestsInfo 数组
    if (b.guestsInfo == null && (b.guestName || b.guestPhone)) {
      b.guestsInfo = [{ name: b.guestName || '', phone: b.guestPhone || '' }];
    }
    next();
  },
  body('roomTypeId').isInt({ min: 1 }).withMessage('roomTypeId 无效'),
  body('checkInDate').isDate().withMessage('入住日期格式错误'),
  body('checkOutDate').isDate().withMessage('离店日期格式错误'),
  body('roomCount').optional().isInt({ min: 1, max: 10 }),
  body('guestsInfo').optional().isArray(),
  validate,
  async (req, res, next) => {
    try {
      const {
        roomTypeId, checkInDate, checkOutDate,
        roomCount = 1, guestsInfo, specialRequest, usePoints,
      } = req.body;

      const nights = dayjs(checkOutDate).diff(dayjs(checkInDate), 'day');
      if (nights < 1) return res.status(400).json({ code: 400, msg: '离店日期必须晚于入住日期' });

      // 查询房型
      const [room] = await query('SELECT * FROM room_types WHERE id = ? AND status = 1 LIMIT 1', [roomTypeId]);
      if (!room) return res.status(400).json({ code: 400, msg: '房型不存在或已下架' });

      // 检查库存（简化：使用 total_rooms 减去该日期段已预订数量）
      const [{ booked }] = await query(
        `SELECT COUNT(*) AS booked FROM orders
         WHERE room_type_id = ? AND status IN (1,2)
           AND check_in_date < ? AND check_out_date > ?`,
        [roomTypeId, checkOutDate, checkInDate],
      );
      if (room.total_rooms - booked < roomCount) {
        return res.status(400).json({ code: 400, msg: '所选日期库存不足' });
      }

      // 计算房费（逐日累加价格日历）
      const calRows = await query(
        `SELECT date, price FROM price_calendar
         WHERE room_type_id = ? AND date >= ? AND date < ?`,
        [roomTypeId, checkInDate, checkOutDate],
      );
      const calMap = Object.fromEntries(calRows.map(r => [r.date, Number(r.price)]));
      let roomPrice = 0;
      for (let i = 0; i < nights; i++) {
        const d = dayjs(checkInDate).add(i, 'day').format('YYYY-MM-DD');
        roomPrice += (calMap[d] ?? Number(room.base_price));
      }
      roomPrice = roomPrice * roomCount;

      // 会员折扣
      const [member] = await query(
        `SELECT m.level, ml.discount FROM members m
         JOIN member_levels ml ON ml.level = m.level
         WHERE m.user_id = ? LIMIT 1`,
        [req.userId],
      );
      const memberDiscountRate = member ? (1 - Number(member.discount)) : 0;
      let memberDiscount = parseFloat((roomPrice * memberDiscountRate).toFixed(2));

      // 积分抵扣
      let pointsDiscount = 0;
      let pointsUsed = 0;
      if (usePoints && usePoints > 0) {
        const [rateSetting] = await query("SELECT `value` FROM settings WHERE `key` = 'points_to_yuan' LIMIT 1");
        const [enabledSetting] = await query("SELECT `value` FROM settings WHERE `key` = 'points_deduct_enabled' LIMIT 1");
        const rate = rateSetting ? Number(rateSetting.value) : 100;
        const enabled = enabledSetting ? Number(enabledSetting.value) : 0;
        if (enabled && rate > 0) {
          const [memberRow] = await query('SELECT points FROM members WHERE user_id = ? LIMIT 1', [req.userId]);
          const availPoints = memberRow ? memberRow.points : 0;
          const actualPoints = Math.min(usePoints, availPoints);
          pointsDiscount = parseFloat((actualPoints / rate).toFixed(2));
          // 不能超过应付金额
          const tempPay = roomPrice - memberDiscount;
          if (pointsDiscount > tempPay) pointsDiscount = tempPay;
          pointsUsed = Math.ceil(pointsDiscount * rate);
        }
      }

      const payAmount = parseFloat((roomPrice - memberDiscount - pointsDiscount).toFixed(2));
      const orderNo   = genOrderNo();

      let orderId;
      await transaction(async conn => {
        const [result] = await conn.execute(
          `INSERT INTO orders
            (order_no, user_id, room_type_id, check_in_date, check_out_date, nights, room_count,
             guests_info, special_request, room_price, member_discount, pay_amount, status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)`,
          [orderNo, req.userId, roomTypeId, checkInDate, checkOutDate, nights, roomCount,
           JSON.stringify(guestsInfo || []), specialRequest || null,
           roomPrice, memberDiscount, payAmount],
        );
        orderId = result.insertId;
        // 扣减积分
        if (pointsUsed > 0) {
          await conn.execute(
            'UPDATE members SET points = points - ? WHERE user_id = ?',
            [pointsUsed, req.userId],
          );
          const [[{ bal }]] = await conn.execute(
            'SELECT points AS bal FROM members WHERE user_id = ?', [req.userId]
          );
          await conn.execute(
            "INSERT INTO points_logs (user_id, type, points, balance, remark, ref_id) VALUES (?,?,?,?,?,?)",
            [req.userId, 'use', -pointsUsed, bal, `订单${orderNo}积分抵扣`, orderNo],
          );
        }
      });

      return ok(res, { orderId, orderNo, payAmount }, '下单成功，请在30分钟内完成支付');
    } catch (err) { next(err); }
  },
);

// ── 状态名 → 数字映射（前端 tab key → 数据库 status） ─────────────────────────
// 数据库 schema：0待支付 1待入住 2入住中 3已退房 4已取消 5退款中 6已退款
const STATUS_MAP = {
  pending_payment: 0,
  pending_checkin: 1,
  checked_in:      2,
  completed:       3,
  cancelled:       4,
  refund_pending:  5,
  refunded:        6,
};

// ── GET /  我的订单列表 ───────────────────────────────────────────────────────
router.get('/', mpAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const { pageSize, offset, page: p } = parsePager(req.query);
    const conditions = ['o.user_id = ?'];
    const params     = [req.userId];
    if (status !== undefined && status !== '') {
      const statusVal = STATUS_MAP[status] !== undefined ? STATUS_MAP[status] : Number(status);
      if (isNaN(statusVal)) return res.status(400).json({ code: 400, msg: '无效的订单状态' });
      conditions.push('o.status = ?');
      params.push(statusVal);
    }
    const where = 'WHERE ' + conditions.join(' AND ');
    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params),
      query(
        `SELECT o.order_no, o.check_in_date, o.check_out_date, o.nights, o.room_count,
                o.pay_amount, o.status, o.created_at,
                rt.name AS room_name, rt.images AS room_images
         FROM orders o
         JOIN room_types rt ON rt.id = o.room_type_id
         ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    // 签名房型图片（列表版）
    const signedList = list.map(item => {
      let images = [];
      if (item.room_images) {
        try { images = JSON.parse(item.room_images); } catch { images = [item.room_images]; }
      }
      return { ...item, room_images: JSON.stringify(signUrls(images)) };
    });
    return page(res, { list: signedList, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /:orderNo  订单详情 ───────────────────────────────────────────────────
router.get('/:orderNo', mpAuth, async (req, res, next) => {
  try {
    const [order] = await query(
      `SELECT o.*, rt.name AS room_name, rt.images AS room_images, rt.facilities,
               r.room_no, ml.name AS level_name
       FROM orders o
       JOIN room_types rt ON rt.id = o.room_type_id
       LEFT JOIN rooms r ON r.id = o.room_id
       LEFT JOIN members m ON m.user_id = o.user_id
       LEFT JOIN member_levels ml ON ml.level = m.level
       WHERE o.order_no = ? AND o.user_id = ? LIMIT 1`,
      [req.params.orderNo, req.userId],
    );
    if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });

    // 解析 guests_info JSON
    if (typeof order.guests_info === 'string') {
      try { order.guests_info = JSON.parse(order.guests_info); } catch { order.guests_info = []; }
    }
    if (!Array.isArray(order.guests_info)) order.guests_info = [];
    if (order.guests_info.length > 0) {
      order.guestName  = order.guests_info[0].name  || '';
      order.guestPhone = order.guests_info[0].phone || '';
    }

    // 签名房型图片
    let images = [];
    if (order.room_images) {
      try { images = JSON.parse(order.room_images); } catch { images = [order.room_images]; }
    }
    order.room_images = JSON.stringify(signUrls(images));

    return ok(res, order);
  } catch (err) { next(err); }
});

// ── POST /:orderNo/cancel  取消订单 ──────────────────────────────────────────
router.post('/:orderNo/cancel',
  mpAuth,
  body('reason').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const [order] = await query(
        'SELECT id, status, pay_status, pay_amount FROM orders WHERE order_no = ? AND user_id = ? LIMIT 1',
        [req.params.orderNo, req.userId],
      );
      if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
      if (![0, 1].includes(order.status)) {
        return res.status(400).json({ code: 400, msg: '当前订单状态不支持取消' });
      }
      const newStatus = order.pay_status === 1 ? 5 : 4; // 已付款→退款中，未付款→已取消
      const reason = req.body.reason || (newStatus === 5 ? '用户取消订单' : null);

      if (newStatus === 5) {
        // 已付款订单：取消 = 申请退款，需同步写入 refunds 表供后台审核
        const refundNo = 'RF' + dayjs().format('YYYYMMDDHHmmss') + String(Math.floor(Math.random() * 1e4)).padStart(4, '0');
        await transaction(async conn => {
          await conn.execute(
            'INSERT INTO refunds (order_no, refund_no, user_id, amount, reason, status) VALUES (?,?,?,?,?,0)',
            [req.params.orderNo, refundNo, req.userId, order.pay_amount, reason],
          );
          await conn.execute(
            'UPDATE orders SET status = ?, cancel_reason = ?, cancel_at = NOW() WHERE order_no = ?',
            [newStatus, reason, req.params.orderNo],
          );
        });
      } else {
        await query(
          'UPDATE orders SET status = ?, cancel_reason = ?, cancel_at = NOW() WHERE order_no = ?',
          [newStatus, reason, req.params.orderNo],
        );
      }
      return ok(res, null, newStatus === 5 ? '已申请退款，请等待审核' : '订单已取消');
    } catch (err) { next(err); }
  },
);

// ── POST /:orderNo/refund  申请退款 ──────────────────────────────────────────
router.post('/:orderNo/refund',
  mpAuth,
  body('reason').notEmpty().withMessage('请填写退款原因'),
  validate,
  async (req, res, next) => {
    try {
      const [order] = await query(
        'SELECT id, status, pay_amount, pay_status FROM orders WHERE order_no = ? AND user_id = ? LIMIT 1',
        [req.params.orderNo, req.userId],
      );
      if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
      if (order.pay_status !== 1) return res.status(400).json({ code: 400, msg: '订单未支付，无需退款' });
      if (![1, 2].includes(order.status)) {
        return res.status(400).json({ code: 400, msg: '当前订单状态不支持退款申请' });
      }

      const refundNo = 'RF' + dayjs().format('YYYYMMDDHHmmss') + String(Math.floor(Math.random() * 1e4)).padStart(4, '0');
      await transaction(async conn => {
        await conn.execute(
          'INSERT INTO refunds (order_no, refund_no, user_id, amount, reason, status) VALUES (?,?,?,?,?,0)',
          [req.params.orderNo, refundNo, req.userId, order.pay_amount, req.body.reason],
        );
        await conn.execute('UPDATE orders SET status = 5 WHERE order_no = ?', [req.params.orderNo]);
      });
      return ok(res, { refundNo }, '退款申请已提交，请等待审核');
    } catch (err) { next(err); }
  },
);

module.exports = router;
