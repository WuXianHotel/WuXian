'use strict';
/**
 * 管理后台 · 会员管理
 * GET   /api/admin/members           会员列表
 * GET   /api/admin/members/stats     会员等级统计
 * GET   /api/admin/members/:id       会员详情
 * PATCH /api/admin/members/:id/points  人工调整积分
 * PATCH /api/admin/members/:id/status  封禁/解封用户
 * GET   /api/admin/members/:id/orders  会员订单历史
 * GET   /api/admin/coupons/templates   优惠券模板列表
 * POST  /api/admin/coupons/templates   新增优惠券模板
 * POST  /api/admin/coupons/send        批量发券
 */
const router = require('express').Router();
const { body } = require('express-validator');
const { query, transaction } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');
const { checkLevelUpgrade } = require('../../middleware/levelCheck');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

// ── GET /levels  获取所有会员等级 ─────────────────────────────────────────────
router.get('/levels', adminAuth(), async (req, res, next) => {
  try {
    const list = await query('SELECT * FROM member_levels ORDER BY level ASC');
    return ok(res, list);
  } catch (err) { next(err); }
});

// ── POST /levels  新增会员等级 ───────────────────────────────────────────────
router.post('/levels',
  adminAuth('super'),
  body('level').isInt({ min: 1 }),
  body('name').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const f = req.body;
      await query(
        `INSERT INTO member_levels (level, name, min_nights, min_points, discount, points_rate, deduct_rate, icon, color)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [f.level, f.name, f.minNights || 0, f.minPoints || 0,
         f.discount ?? 1, f.pointsRate ?? 1, f.deductRate ?? 1,
         f.icon || '⭐', f.color || '#999'],
      );
      return ok(res, null, '等级创建成功');
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ code: 400, msg: '等级值重复' });
      next(err);
    }
  },
);

// ── PUT /levels/:id  更新会员等级 ────────────────────────────────────────────
router.put('/levels/:id',
  adminAuth('super'),
  body('name').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const f = req.body;
      await query(
        `UPDATE member_levels SET
           name = ?, min_nights = ?, min_points = ?,
           discount = ?, points_rate = ?, deduct_rate = ?,
           icon = ?, color = ?
         WHERE id = ?`,
        [f.name, f.minNights ?? 0, f.minPoints ?? 0,
         f.discount ?? 1, f.pointsRate ?? 1, f.deductRate ?? 1,
         f.icon || '⭐', f.color || '#999', req.params.id],
      );
      return ok(res, null, '等级更新成功');
    } catch (err) { next(err); }
  },
);

// ── DELETE /levels/:id  删除会员等级 ─────────────────────────────────────────
router.delete('/levels/:id', adminAuth('super'), async (req, res, next) => {
  try {
    // 检查是否有会员使用该等级
    const [level] = await query('SELECT level FROM member_levels WHERE id = ? LIMIT 1', [req.params.id]);
    if (!level) return res.status(404).json({ code: 404, msg: '等级不存在' });
    const [{ cnt }] = await query('SELECT COUNT(*) AS cnt FROM members WHERE level = ?', [level.level]);
    if (cnt > 0) return res.status(400).json({ code: 400, msg: `该等级下有 ${cnt} 位会员，无法删除` });
    await query('DELETE FROM member_levels WHERE id = ?', [req.params.id]);
    return ok(res, null, '等级已删除');
  } catch (err) { next(err); }
});

// ── GET /points-stats  积分总览统计 ──────────────────────────────────────────
router.get('/points-stats', adminAuth(), async (req, res, next) => {
  try {
    const [[totalRow], [earnRow], [useRow], [adjustRow]] = await Promise.all([
      query('SELECT SUM(points) AS total FROM members'),
      query("SELECT COALESCE(SUM(points),0) AS val FROM points_logs WHERE type='earn'"),
      query("SELECT COALESCE(SUM(ABS(points)),0) AS val FROM points_logs WHERE type='use'"),
      query("SELECT COALESCE(SUM(points),0) AS val FROM points_logs WHERE type='adjust'"),
    ]);
    return ok(res, {
      totalPoints: totalRow?.total || 0,
      totalEarned: earnRow?.val || 0,
      totalUsed: useRow?.val || 0,
      totalAdjusted: adjustRow?.val || 0,
    });
  } catch (err) { next(err); }
});

// ── GET /points-logs  全局积分流水（分页） ──────────────────────────────────────
router.get('/points-logs', adminAuth(), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { type, keyword } = req.query;
    const cond = []; const params = [];
    if (type) { cond.push('pl.type = ?'); params.push(type); }
    if (keyword) {
      cond.push('(u.nickname LIKE ? OR u.phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const [[{ total }], list] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total FROM points_logs pl JOIN users u ON u.id = pl.user_id ${where}`,
        params,
      ),
      query(
        `SELECT pl.id, pl.user_id, pl.type, pl.points, pl.balance, pl.remark, pl.ref_id, pl.created_at,
                u.nickname, u.phone
         FROM points_logs pl
         JOIN users u ON u.id = pl.user_id
         ${where}
         ORDER BY pl.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /wallet-stats  余额总览统计 ──────────────────────────────────────────
router.get('/wallet-stats', adminAuth(), async (req, res, next) => {
  try {
    const [[totalRow], [rechargeRow], [consumeRow], [bonusRow]] = await Promise.all([
      query('SELECT COALESCE(SUM(wallet_balance),0) AS val FROM users'),
      query("SELECT COALESCE(SUM(amount),0) AS val FROM wallet_logs WHERE type='recharge'"),
      query("SELECT COALESCE(SUM(ABS(amount)),0) AS val FROM wallet_logs WHERE type='consume'"),
      query("SELECT COALESCE(SUM(amount),0) AS val FROM wallet_logs WHERE type='bonus'"),
    ]);
    return ok(res, {
      totalBalance: Number(totalRow?.val) || 0,
      totalRecharge: Number(rechargeRow?.val) || 0,
      totalConsume: Number(consumeRow?.val) || 0,
      totalBonus: Number(bonusRow?.val) || 0,
    });
  } catch (err) { next(err); }
});

// ── GET /wallet-logs  全局余额流水（分页） ──────────────────────────────────────
router.get('/wallet-logs', adminAuth(), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { type, keyword } = req.query;
    const cond = []; const params = [];
    if (type) { cond.push('wl.type = ?'); params.push(type); }
    if (keyword) {
      cond.push('(u.nickname LIKE ? OR u.phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM wallet_logs wl JOIN users u ON u.id = wl.user_id ${where}`, params),
      query(
        `SELECT wl.id, wl.user_id, wl.type, wl.amount, wl.balance, wl.remark, wl.ref_order_no, wl.created_at,
                u.nickname, u.phone
         FROM wallet_logs wl
         JOIN users u ON u.id = wl.user_id
         ${where}
         ORDER BY wl.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── PATCH /:id/wallet  人工调整余额 ─────────────────────────────────────────
router.patch('/:id/wallet',
  adminAuth('super', 'operation', 'finance'),
  body('amount').isFloat({ min: 0.01 }).withMessage('金额必须大于0'),
  body('action').isIn(['add', 'sub']).withMessage('action 须为 add 或 sub'),
  body('remark').notEmpty().withMessage('备注不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const { amount, action, remark } = req.body;
      const [member] = await query('SELECT user_id FROM members WHERE id = ? LIMIT 1', [req.params.id]);
      if (!member) return res.status(404).json({ code: 404, msg: '会员不存在' });

      const changeAmount = action === 'sub' ? -Math.abs(amount) : Math.abs(amount);

      let newBalance;
      await transaction(async conn => {
        const [[user]] = await conn.execute(
          'SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE', [member.user_id]
        );
        newBalance = parseFloat((Number(user.wallet_balance) + changeAmount).toFixed(2));
        if (newBalance < 0) throw Object.assign(new Error('余额不足，无法扣减'), { status: 400 });
        await conn.execute('UPDATE users SET wallet_balance = ? WHERE id = ?', [newBalance, member.user_id]);
        const logType = action === 'sub' ? 'consume' : 'recharge';
        await conn.execute(
          'INSERT INTO wallet_logs (user_id, type, amount, balance, remark) VALUES (?,?,?,?,?)',
          [member.user_id, logType, changeAmount, newBalance, `[管理员] ${remark}`],
        );
      });
      return ok(res, { newBalance }, '余额调整成功');
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ code: 400, msg: err.message });
      next(err);
    }
  },
);

// ── GET /:id/wallet-logs  单会员余额流水 ────────────────────────────────────
router.get('/:id/wallet-logs', adminAuth(), async (req, res, next) => {
  try {
    const [member] = await query('SELECT user_id FROM members WHERE id = ? LIMIT 1', [req.params.id]);
    if (!member) return res.status(404).json({ code: 404, msg: '会员不存在' });
    const { pageSize, offset, page: p } = parsePager(req.query);
    const [[{ total }], list] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM wallet_logs WHERE user_id = ?', [member.user_id]),
      query(
        `SELECT id, type, amount, balance, remark, ref_order_no, created_at
         FROM wallet_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [member.user_id, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /stats ────────────────────────────────────────────────────────────────
router.get('/stats', adminAuth(), async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT level, COUNT(*) AS cnt FROM members GROUP BY level',
    );
    const total = await query('SELECT COUNT(*) AS total FROM members');
    return ok(res, { total: total[0].total, byLevel: rows });
  } catch (err) { next(err); }
});

// ── GET /  会员列表 ───────────────────────────────────────────────────────────
router.get('/', adminAuth(), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { keyword, level, status } = req.query;
    const cond = []; const params = [];
    if (keyword) {
      cond.push('(u.nickname LIKE ? OR u.phone LIKE ? OR m.member_no LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (level !== undefined && level !== '')  { cond.push('m.level = ?');  params.push(Number(level)); }
    if (status !== undefined && status !== ''){ cond.push('u.status = ?'); params.push(Number(status)); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

    const [[{ total }], list] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total FROM members m JOIN users u ON u.id = m.user_id ${where}`, params,
      ),
      query(
        `SELECT m.id, m.member_no, m.level, m.points, m.total_nights, m.total_amount, m.created_at,
                u.id AS user_id, u.nickname, u.phone, u.avatar_url, u.status, u.wallet_balance,
                ml.name AS level_name, ml.icon, ml.color
         FROM members m
         JOIN users u ON u.id = m.user_id
         JOIN member_levels ml ON ml.level = m.level
         ${where}
         ORDER BY m.total_amount DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /:id  会员详情 ────────────────────────────────────────────────────────
router.get('/:id', adminAuth(), async (req, res, next) => {
  try {
    const [member] = await query(
      `SELECT m.*, u.nickname, u.phone, u.avatar_url, u.real_name, u.gender, u.status AS user_status,
              ml.name AS level_name, ml.discount, ml.icon, ml.color
       FROM members m
       JOIN users u ON u.id = m.user_id
       JOIN member_levels ml ON ml.level = m.level
       WHERE m.id = ? LIMIT 1`,
      [req.params.id],
    );
    if (!member) return res.status(404).json({ code: 404, msg: '会员不存在' });
    return ok(res, member);
  } catch (err) { next(err); }
});

// ── PATCH /:id/points  人工调整积分 ──────────────────────────────────────────
router.patch('/:id/points',
  adminAuth('super', 'operation'),
  body('points').isInt().withMessage('积分必须为整数'),
  body('remark').notEmpty().withMessage('备注不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const { points, remark } = req.body;
      const [member] = await query('SELECT user_id, points FROM members WHERE id = ? LIMIT 1', [req.params.id]);
      if (!member) return res.status(404).json({ code: 404, msg: '会员不存在' });
      const newBalance = Math.max(0, member.points + points);
      await transaction(async conn => {
        await conn.execute('UPDATE members SET points = ? WHERE id = ?', [newBalance, req.params.id]);
        await conn.execute(
          'INSERT INTO points_logs (user_id, type, points, balance, remark) VALUES (?,?,?,?,?)',
          [member.user_id, 'adjust', points, newBalance, remark],
        );
      });
      // 检查等级升级
      await checkLevelUpgrade(member.user_id);

      return ok(res, { newBalance }, '积分调整成功');
    } catch (err) { next(err); }
  },
);

// ── PATCH /:id/status  封禁/解封 ─────────────────────────────────────────────
router.patch('/:id/status',
  adminAuth('super'),
  body('status').isIn([0, 1]),
  validate,
  async (req, res, next) => {
    try {
      const [member] = await query('SELECT user_id FROM members WHERE id = ? LIMIT 1', [req.params.id]);
      if (!member) return res.status(404).json({ code: 404, msg: '会员不存在' });
      await query('UPDATE users SET status = ? WHERE id = ?', [req.body.status, member.user_id]);
      return ok(res, null, req.body.status === 1 ? '账号已解封' : '账号已封禁');
    } catch (err) { next(err); }
  },
);

// ── DELETE /:id  删除会员 ────────────────────────────────────────────────────
router.delete('/:id', adminAuth('super'), async (req, res, next) => {
  try {
    const [member] = await query('SELECT user_id FROM members WHERE id = ? LIMIT 1', [req.params.id]);
    if (!member) return res.status(404).json({ code: 404, msg: '会员不存在' });
    // 检查是否有进行中的订单
    const [{ cnt }] = await query(
      'SELECT COUNT(*) AS cnt FROM orders WHERE user_id = ? AND status IN (0,1,2)',
      [member.user_id],
    );
    if (cnt > 0) return res.status(400).json({ code: 400, msg: '该会员有进行中的订单，无法删除' });
    await transaction(async conn => {
      await conn.execute('DELETE FROM members WHERE id = ?', [req.params.id]);
      await conn.execute('DELETE FROM users WHERE id = ?', [member.user_id]);
    });
    return ok(res, null, '会员已删除');
  } catch (err) { next(err); }
});

// ── GET /:id/points-logs  会员积分明细 ────────────────────────────────────────
router.get('/:id/points-logs', adminAuth(), async (req, res, next) => {
  try {
    const [member] = await query('SELECT user_id FROM members WHERE id = ? LIMIT 1', [req.params.id]);
    if (!member) return res.status(404).json({ code: 404, msg: '会员不存在' });
    const { pageSize, offset, page: p } = parsePager(req.query);
    const [[{ total }], list] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM points_logs WHERE user_id = ?', [member.user_id]),
      query(
        `SELECT id, type, points, balance, remark, ref_id, created_at
         FROM points_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [member.user_id, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── GET /:id/orders  会员订单历史 ─────────────────────────────────────────────
router.get('/:id/orders', adminAuth(), async (req, res, next) => {
  try {
    const [member] = await query('SELECT user_id FROM members WHERE id = ? LIMIT 1', [req.params.id]);
    if (!member) return res.status(404).json({ code: 404, msg: '会员不存在' });
    const { pageSize, offset, page: p } = parsePager(req.query);
    const [[{ total }], list] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [member.user_id]),
      query(
        `SELECT o.order_no, o.check_in_date, o.check_out_date, o.nights, o.pay_amount, o.status, o.created_at,
                rt.name AS room_name
         FROM orders o JOIN room_types rt ON rt.id = o.room_type_id
         WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
        [member.user_id, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── 优惠券模板 ────────────────────────────────────────────────────────────────
router.get('/coupons/templates', adminAuth(), async (req, res, next) => {
  try {
    const list = await query('SELECT * FROM coupon_templates ORDER BY created_at DESC');
    return ok(res, list);
  } catch (err) { next(err); }
});

router.post('/coupons/templates',
  adminAuth('super', 'operation'),
  body('name').notEmpty(),
  body('type').isIn([1, 2]),
  body('value').isFloat({ min: 0 }),
  validate,
  async (req, res, next) => {
    try {
      const f = req.body;
      await query(
        `INSERT INTO coupon_templates
          (name, type, value, min_amount, total_count, per_limit, valid_days, start_at, end_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [f.name, f.type, f.value, f.minAmount || 0, f.totalCount ?? -1,
         f.perLimit || 1, f.validDays || null, f.startAt || null, f.endAt || null],
      );
      return ok(res, null, '优惠券模板创建成功');
    } catch (err) { next(err); }
  },
);

// ── 批量发券 ──────────────────────────────────────────────────────────────────
router.post('/coupons/send',
  adminAuth('super', 'operation'),
  body('templateId').isInt({ min: 1 }),
  body('userIds').isArray({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { templateId, userIds } = req.body;
      const [tpl] = await query('SELECT * FROM coupon_templates WHERE id = ? AND status = 1 LIMIT 1', [templateId]);
      if (!tpl) return res.status(404).json({ code: 404, msg: '优惠券模板不存在' });

      const expireAt = tpl.valid_days
        ? dayjs().add(tpl.valid_days, 'day').format('YYYY-MM-DD')
        : tpl.end_at;

      let sent = 0;
      await transaction(async conn => {
        for (const uid of userIds) {
          const code = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();
          await conn.execute(
            'INSERT IGNORE INTO user_coupons (user_id, template_id, code, expire_at) VALUES (?,?,?,?)',
            [uid, templateId, code, expireAt],
          );
          sent++;
        }
        await conn.execute(
          'UPDATE coupon_templates SET issued_count = issued_count + ? WHERE id = ?',
          [sent, templateId],
        );
      });
      return ok(res, { sent }, `已向 ${sent} 位用户发放优惠券`);
    } catch (err) { next(err); }
  },
);

module.exports = router;
