'use strict';
/**
 * 管理后台 · 财务报表
 * GET /api/admin/reports/overview     核心 KPI 汇总（今日/本月/本年）
 * GET /api/admin/reports/daily        日收入趋势（指定月份每天）
 * GET /api/admin/reports/monthly      月收入趋势（指定年份每月）
 * GET /api/admin/reports/room-types   各房型收入占比
 * GET /api/admin/reports/export       导出报表（CSV）
 */
const router = require('express').Router();
const dayjs  = require('dayjs');
const { query } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { ok } = require('../../middleware/helper');

// ── GET /overview ─────────────────────────────────────────────────────────────
router.get('/overview', adminAuth('super', 'finance'), async (req, res, next) => {
  try {
    const [[todayRow], [monthRow], [yearRow], [occupancy]] = await Promise.all([
      query(`SELECT COALESCE(SUM(pay_amount),0) AS amount, COUNT(*) AS orders
             FROM orders WHERE DATE(created_at) = CURDATE() AND pay_status = 1`),
      query(`SELECT COALESCE(SUM(pay_amount),0) AS amount, COUNT(*) AS orders
             FROM orders WHERE DATE_FORMAT(created_at,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m') AND pay_status = 1`),
      query(`SELECT COALESCE(SUM(pay_amount),0) AS amount, COUNT(*) AS orders
             FROM orders WHERE YEAR(created_at) = YEAR(NOW()) AND pay_status = 1`),
      query(`SELECT
               COUNT(CASE WHEN status = 1 THEN 1 END) AS occupied,
               COUNT(*) AS total
             FROM rooms`),
    ]);
    return ok(res, {
      today:     { amount: todayRow.amount, orders: todayRow.orders },
      thisMonth: { amount: monthRow.amount, orders: monthRow.orders },
      thisYear:  { amount: yearRow.amount,  orders: yearRow.orders  },
      occupancyRate: occupancy.total > 0
        ? parseFloat((occupancy.occupied / occupancy.total * 100).toFixed(1))
        : 0,
    });
  } catch (err) { next(err); }
});

// ── GET /daily  日收入趋势 ────────────────────────────────────────────────────
router.get('/daily', adminAuth('super', 'finance'), async (req, res, next) => {
  try {
    const { year, month, start, end } = req.query;
    let startDate, endDate;
    if (start && end) {
      // 支持日期范围查询
      startDate = start;
      endDate   = end;
    } else {
      // 兼容旧版 year/month 查询
      const ym = `${year || dayjs().year()}-${String(month || dayjs().month() + 1).padStart(2,'0')}`;
      startDate = `${ym}-01`;
      endDate   = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
    }
    const rows = await query(
      `SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS date,
              COALESCE(SUM(pay_amount),0)          AS amount,
              COUNT(*)                              AS orders
       FROM orders
       WHERE DATE(created_at) BETWEEN ? AND ? AND pay_status = 1
       GROUP BY DATE_FORMAT(created_at,'%Y-%m-%d')
       ORDER BY date`,
      [startDate, endDate],
    );
    return ok(res, rows);
  } catch (err) { next(err); }
});

// ── GET /monthly  月收入趋势 ──────────────────────────────────────────────────
router.get('/monthly', adminAuth('super', 'finance'), async (req, res, next) => {
  try {
    const year = req.query.year || dayjs().year();
    const rows = await query(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,
              COALESCE(SUM(pay_amount),0)      AS amount,
              COUNT(*)                          AS orders
       FROM orders
       WHERE YEAR(created_at) = ? AND pay_status = 1
       GROUP BY DATE_FORMAT(created_at,'%Y-%m')
       ORDER BY month`,
      [year],
    );
    return ok(res, rows);
  } catch (err) { next(err); }
});

// ── GET /room-types  各房型收入 ───────────────────────────────────────────────
router.get('/room-types', adminAuth('super', 'finance'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || dayjs().startOf('month').format('YYYY-MM-DD');
    const end   = endDate   || dayjs().format('YYYY-MM-DD');
    const rows = await query(
      `SELECT rt.name, rt.id,
              COALESCE(SUM(o.pay_amount),0) AS amount,
              COUNT(o.id)                   AS orders
       FROM room_types rt
       LEFT JOIN orders o ON o.room_type_id = rt.id
         AND DATE(o.created_at) BETWEEN ? AND ?
         AND o.pay_status = 1
       GROUP BY rt.id, rt.name
       ORDER BY amount DESC`,
      [start, end],
    );
    return ok(res, rows);
  } catch (err) { next(err); }
});

// ── GET /export  导出 CSV ─────────────────────────────────────────────────────
router.get('/export', adminAuth('super', 'finance'), async (req, res, next) => {
  try {
    const { startDate, endDate, type = 'orders' } = req.query;
    const start = startDate || dayjs().startOf('month').format('YYYY-MM-DD');
    const end   = endDate   || dayjs().format('YYYY-MM-DD');

    let rows, headers;
    if (type === 'orders') {
      headers = ['订单号','房型','入住人','手机号','入住日期','离店日期','晚数','实付金额','状态','下单时间'];
      rows = await query(
        `SELECT o.order_no, rt.name, u.nickname, u.phone,
                o.check_in_date, o.check_out_date, o.nights,
                o.pay_amount,
                CASE o.status WHEN 0 THEN '待支付' WHEN 1 THEN '待入住' WHEN 2 THEN '入住中'
                  WHEN 3 THEN '已退房' WHEN 4 THEN '已取消' WHEN 5 THEN '退款中' WHEN 6 THEN '已退款' END AS status_text,
                o.created_at
         FROM orders o
         JOIN room_types rt ON rt.id = o.room_type_id
         JOIN users u ON u.id = o.user_id
         WHERE DATE(o.created_at) BETWEEN ? AND ?
         ORDER BY o.created_at DESC`,
        [start, end],
      );
    } else {
      headers = ['日期','收入金额','订单数'];
      rows = await query(
        `SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS date,
                COALESCE(SUM(pay_amount),0) AS amount, COUNT(*) AS orders
         FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND pay_status = 1
         GROUP BY DATE_FORMAT(created_at,'%Y-%m-%d') ORDER BY date`,
        [start, end],
      );
    }

    const csvLines = [
      headers.join(','),
      ...rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report_${start}_${end}.csv"`);
    res.send('\uFEFF' + csvLines.join('\r\n')); // BOM for Excel
  } catch (err) { next(err); }
});

module.exports = router;
