'use strict';
/**
 * 小程序端 · 会员中心
 * GET  /api/mp/member/info        会员信息
 * GET  /api/mp/member/levels      等级列表
 * GET  /api/mp/member/points      积分流水
 * GET  /api/mp/member/deduct-info 积分抵扣信息
 */
const router = require('express').Router();
const { query } = require('../../config/db');
const { mpAuth } = require('../../middleware/auth');
const { parsePager, ok, page } = require('../../middleware/helper');
const { checkLevelUpgrade } = require('../../middleware/levelCheck');

// ── GET /info ─────────────────────────────────────────────────────────────────
router.get('/info', mpAuth, async (req, res, next) => {
  try {
    // 先做一次等级升级检查（兜底）
    await checkLevelUpgrade(req.userId);

    const [info] = await query(
      `SELECT m.member_no, m.level, m.points, m.points_total, m.total_nights, m.total_amount,
              ml.name AS level_name, ml.discount, ml.points_rate, ml.deduct_rate, ml.icon, ml.color,
              ml2.name AS next_level_name, ml2.min_nights AS next_min_nights, ml2.min_points AS next_min_points,
              u.wallet_balance
       FROM members m
       JOIN member_levels ml  ON ml.level  = m.level
       LEFT JOIN member_levels ml2 ON ml2.level = m.level + 1
       JOIN users u ON u.id = m.user_id
       WHERE m.user_id = ? LIMIT 1`,
      [req.userId],
    );
    if (!info) return res.status(404).json({ code: 404, msg: '会员信息不存在' });
    return ok(res, info);
  } catch (err) { next(err); }
});

// ── GET /levels  获取所有会员等级（供小程序端等级进度页使用） ──────────────────
router.get('/levels', mpAuth, async (req, res, next) => {
  try {
    const list = await query('SELECT level, name, min_nights, min_points, discount, points_rate, deduct_rate, icon, color FROM member_levels ORDER BY level ASC');
    return ok(res, list);
  } catch (err) { next(err); }
});

// ── GET /points  积分流水 ─────────────────────────────────────────────────────
router.get('/points', mpAuth, async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const [[{ total }], list] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM points_logs WHERE user_id = ?', [req.userId]),
      query(
        'SELECT id, type, points, balance, remark, ref_id, created_at FROM points_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [req.userId, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /deduct-info  积分抵扣信息 ───────────────────────────────────────────
router.get('/deduct-info', mpAuth, async (req, res, next) => {
  try {
    const [member] = await query(
      `SELECT m.points, ml.deduct_rate
       FROM members m
       JOIN member_levels ml ON ml.level = m.level
       WHERE m.user_id = ? LIMIT 1`,
      [req.userId],
    );
    const [rateSetting] = await query("SELECT `value` FROM settings WHERE `key` = 'points_to_yuan' LIMIT 1");
    const [enabledSetting] = await query("SELECT `value` FROM settings WHERE `key` = 'points_deduct_enabled' LIMIT 1");
    const baseRate = rateSetting ? Number(rateSetting.value) : 100; // 基础汇率：X 积分 = 1 元
    const deductRate = member?.deduct_rate ? Number(member.deduct_rate) : 1; // 等级倍率
    const effectiveRate = Math.max(1, Math.round(baseRate / deductRate)); // 实际汇率（倍率越高越划算）
    const enabled = enabledSetting ? Number(enabledSetting.value) : 0;
    const points = member ? member.points : 0;
    const maxDeduct = effectiveRate > 0 ? parseFloat((points / effectiveRate).toFixed(2)) : 0;
    return ok(res, { enabled: !!enabled, points, rate: effectiveRate, baseRate, deductRate, maxDeduct });
  } catch (err) { next(err); }
});

module.exports = router;
