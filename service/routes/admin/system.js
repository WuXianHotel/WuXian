'use strict';
/**
 * 管理后台 · 系统设置
 * GET  /api/admin/system/settings         获取所有设置
 * PUT  /api/admin/system/settings         批量更新设置
 * GET  /api/admin/system/admins           管理员列表
 * POST /api/admin/system/admins           新增管理员
 * PUT  /api/admin/system/admins/:id       编辑管理员
 * PATCH/api/admin/system/admins/:id/status 启用/禁用管理员
 * DELETE /api/admin/system/admins/:id     删除管理员
 * GET  /api/admin/system/logs             操作日志列表
 */
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { body } = require('express-validator');
const { query } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');

// ── GET /settings ─────────────────────────────────────────────────────────────
router.get('/settings', adminAuth(), async (req, res, next) => {
  try {
    const rows = await query('SELECT `key`, `value`, `type`, `label`, `group` FROM settings ORDER BY `group`, id');
    // 转为 group → items 结构
    const grouped = rows.reduce((acc, r) => {
      (acc[r.group] = acc[r.group] || []).push(r);
      return acc;
    }, {});
    return ok(res, grouped);
  } catch (err) { next(err); }
});

// ── PUT /settings ─────────────────────────────────────────────────────────────
router.put('/settings',
  adminAuth('super'),
  body('settings').isObject().withMessage('settings 须为对象（key:value）'),
  validate,
  async (req, res, next) => {
    try {
      const entries = Object.entries(req.body.settings);
      for (const [key, value] of entries) {
        await query(
          'INSERT INTO settings (`key`, `value`, `type`, `group`) VALUES (?, ?, \'string\', \'system\') ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
          [key, String(value ?? '')]
        );
      }
      return ok(res, null, `已更新 ${entries.length} 项设置`);
    } catch (err) { next(err); }
  },
);

// ── GET /admins ───────────────────────────────────────────────────────────────
router.get('/admins', adminAuth('super'), async (req, res, next) => {
  try {
    const list = await query(
      `SELECT au.id, au.username, au.real_name, au.role, au.role_id, au.status, au.last_login, au.created_at,
              r.label AS role_label
       FROM admin_users au
       LEFT JOIN roles r ON r.id = au.role_id
       ORDER BY au.id`,
    );
    return ok(res, list);
  } catch (err) { next(err); }
});

// ── POST /admins ──────────────────────────────────────────────────────────────
router.post('/admins',
  adminAuth('super'),
  body('username').notEmpty().isLength({ max: 50 }),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['super', 'front_desk', 'finance', 'operation']),
  validate,
  async (req, res, next) => {
    try {
      const { username, password, realName, role, roleId } = req.body;
      const [exist] = await query('SELECT id FROM admin_users WHERE username = ? LIMIT 1', [username]);
      if (exist) return res.status(400).json({ code: 400, msg: '账号已存在' });
      const hash = await bcrypt.hash(password, 10);
      // role_id 从 roles 表查询
      let resolvedRoleId = roleId || null;
      if (!resolvedRoleId && role) {
        const [r] = await query('SELECT id FROM roles WHERE name = ? LIMIT 1', [role]);
        resolvedRoleId = r ? r.id : null;
      }
      await query(
        'INSERT INTO admin_users (username, password, real_name, role, role_id) VALUES (?,?,?,?,?)',
        [username, hash, realName || null, role, resolvedRoleId],
      );
      return ok(res, null, '管理员创建成功');
    } catch (err) { next(err); }
  },
);

// ── PUT /admins/:id ───────────────────────────────────────────────────────────
router.put('/admins/:id',
  adminAuth('super'),
  async (req, res, next) => {
    try {
      const { realName, role, password, roleId } = req.body;
      if (password) {
        if (password.length < 6) return res.status(400).json({ code: 400, msg: '密码至少6位' });
        const hash = await bcrypt.hash(password, 10);
        await query('UPDATE admin_users SET password = ? WHERE id = ?', [hash, req.params.id]);
      }
      // 解析 role_id
      let resolvedRoleId = roleId ?? null;
      if (resolvedRoleId === undefined && role) {
        const [r] = await query('SELECT id FROM roles WHERE name = ? LIMIT 1', [role]);
        resolvedRoleId = r ? r.id : null;
      }
      await query(
        'UPDATE admin_users SET real_name = COALESCE(?,real_name), role = COALESCE(?,role), role_id = COALESCE(?,role_id) WHERE id = ?',
        [realName ?? null, role ?? null, resolvedRoleId, req.params.id],
      );
      return ok(res, null, '更新成功');
    } catch (err) { next(err); }
  },
);

// ── PATCH /admins/:id/status ──────────────────────────────────────────────────
router.patch('/admins/:id/status',
  adminAuth('super'),
  body('status').isIn([0, 1]),
  validate,
  async (req, res, next) => {
    try {
      if (Number(req.params.id) === req.adminId) {
        return res.status(400).json({ code: 400, msg: '不能禁用自己的账号' });
      }
      await query('UPDATE admin_users SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
      return ok(res, null, req.body.status === 1 ? '已启用' : '已禁用');
    } catch (err) { next(err); }
  },
);

// ── DELETE /admins/:id ────────────────────────────────────────────────────────
router.delete('/admins/:id', adminAuth('super'), async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.adminId) {
      return res.status(400).json({ code: 400, msg: '不能删除自己的账号' });
    }
    await query('DELETE FROM admin_users WHERE id = ?', [req.params.id]);
    return ok(res, null, '删除成功');
  } catch (err) { next(err); }
});

// ── GET /logs ─────────────────────────────────────────────────────────────────
router.get('/logs', adminAuth('super'), async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { adminName, startDate, endDate } = req.query;
    const cond = []; const params = [];
    if (adminName) { cond.push('admin_name LIKE ?'); params.push(`%${adminName}%`); }
    if (startDate) { cond.push('DATE(created_at) >= ?'); params.push(startDate); }
    if (endDate)   { cond.push('DATE(created_at) <= ?'); params.push(endDate); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM admin_logs ${where}`, params),
      query(
        `SELECT id, admin_name, action, method, path, ip, created_at
         FROM admin_logs ${where}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

// ── POST /clear-sessions  强制所有小程序用户重新登录（调试用）────────────────
router.post('/clear-sessions', adminAuth('super'), async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    // 写入或更新 mp_token_revoked_at 设置项
    await query(
      `INSERT INTO settings (\`key\`, \`value\`, \`type\`, \`label\`, \`group\`)
       VALUES ('mp_token_revoked_at', ?, 'string', '小程序Token撤销时间', 'system')
       ON DUPLICATE KEY UPDATE \`value\` = ?`,
      [now, now],
    );
    return ok(res, { revokedAt: now }, `已撤销所有小程序用户登录状态（${now}）`);
  } catch (err) { next(err); }
});

module.exports = router;
