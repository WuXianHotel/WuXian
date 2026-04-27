'use strict';
/**
 * 管理后台 · 认证
 * POST /api/admin/auth/login   登录
 * POST /api/admin/auth/logout  登出（前端清 Token 即可，此处可记日志）
 * GET  /api/admin/auth/me      获取当前管理员信息
 * PUT  /api/admin/auth/password 修改密码
 */
const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const { body } = require('express-validator');
const { query } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { validate, ok } = require('../../middleware/helper');

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login',
  body('username').notEmpty().withMessage('账号不能为空'),
  body('password').notEmpty().withMessage('密码不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const { username, password, role } = req.body;
      const [admin] = await query(
        'SELECT * FROM admin_users WHERE username = ? LIMIT 1',
        [username],
      );
      if (!admin || !await bcrypt.compare(password, admin.password)) {
        return res.status(401).json({ code: 401, msg: '账号或密码错误' });
      }
      if (admin.status !== 1) {
        return res.status(403).json({ code: 403, msg: '账号已被禁用' });
      }
      // 若前端传了 role，校验是否匹配
      if (role && admin.role !== 'super' && admin.role !== role) {
        return res.status(403).json({ code: 403, msg: '您没有该角色权限' });
      }

      const token = jwt.sign(
        { adminId: admin.id, username: admin.username, role: admin.role },
        process.env.ADMIN_JWT_SECRET,
        { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h' },
      );
      await query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id]);
      return ok(res, { token, adminId: admin.id, username: admin.username, role: admin.role, realName: admin.real_name });
    } catch (err) { next(err); }
  },
);

// ── POST /logout ──────────────────────────────────────────────────────────────
router.post('/logout', adminAuth(), async (req, res) => ok(res, null, '已退出登录'));

// ── GET /me ───────────────────────────────────────────────────────────────────
router.get('/me', adminAuth(), async (req, res, next) => {
  try {
    const [admin] = await query(
      'SELECT id, username, real_name, role, last_login, created_at FROM admin_users WHERE id = ? LIMIT 1',
      [req.adminId],
    );
    return ok(res, admin);
  } catch (err) { next(err); }
});

// ── PUT /password ─────────────────────────────────────────────────────────────
router.put('/password',
  adminAuth(),
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位'),
  validate,
  async (req, res, next) => {
    try {
      const [admin] = await query('SELECT password FROM admin_users WHERE id = ? LIMIT 1', [req.adminId]);
      if (!await bcrypt.compare(req.body.oldPassword, admin.password)) {
        return res.status(400).json({ code: 400, msg: '旧密码不正确' });
      }
      const hash = await bcrypt.hash(req.body.newPassword, 10);
      await query('UPDATE admin_users SET password = ? WHERE id = ?', [hash, req.adminId]);
      return ok(res, null, '密码修改成功');
    } catch (err) { next(err); }
  },
);

module.exports = router;
