'use strict';
/**
 * 管理后台 · RBAC 角色权限管理
 *
 * 角色管理:
 *   GET    /api/admin/roles              角色列表（含权限统计）
 *   POST   /api/admin/roles              新增角色
 *   GET    /api/admin/roles/:id          角色详情（含权限列表）
 *   PUT    /api/admin/roles/:id          编辑角色基本信息
 *   DELETE /api/admin/roles/:id          删除角色
 *
 * 权限分配:
 *   PUT    /api/admin/roles/:id/permissions  设置角色权限（全量替换）
 *   GET    /api/admin/roles/:id/admins       查看拥有该角色的管理员列表
 *
 * 权限定义:
 *   GET    /api/admin/permissions           获取所有权限定义（按模块分组）
 *
 * 当前用户权限:
 *   GET    /api/admin/my-permissions        获取当前登录管理员的所有权限标识
 */
const router = require('express').Router();
const { body, param } = require('express-validator');
const { query, transaction } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { validate, ok } = require('../../middleware/helper');

// 所有角色/权限相关操作仅超级管理员可访问
const requireSuper = adminAuth('super');

// ──────────────── 权限定义 ────────────────

// GET /permissions  获取所有权限定义（按模块分组）
router.get('/permissions', adminAuth(), async (req, res, next) => {
  try {
    const list = await query(
      'SELECT id, `key`, label, module, description FROM permissions ORDER BY id',
    );
    // 按模块分组
    const grouped = list.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});
    return ok(res, { list, grouped });
  } catch (err) { next(err); }
});

// ──────────────── 当前用户权限 ────────────────

// GET /my-permissions  获取当前登录管理员的所有权限标识
router.get('/my-permissions', adminAuth(), async (req, res, next) => {
  try {
    const [admin] = await query(
      'SELECT id, username, role, role_id, real_name FROM admin_users WHERE id = ? LIMIT 1',
      [req.adminId],
    );
    if (!admin) return res.status(404).json({ code: 404, msg: '管理员不存在' });

    // super 角色返回所有权限
    let permissions = [];
    if (admin.role === 'super') {
      const rows = await query("SELECT `key` FROM permissions ORDER BY id");
      permissions = rows.map(r => r.key);
    } else if (admin.role_id) {
      const rows = await query(
        `SELECT p.key FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = ?
         ORDER BY p.id`,
        [admin.role_id],
      );
      permissions = rows.map(r => r.key);
    }

    return ok(res, {
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      roleId: admin.role_id,
      permissions,
    });
  } catch (err) { next(err); }
});

// ──────────────── 角色管理 ────────────────

// GET /roles  角色列表
router.get('/roles', requireSuper, async (req, res, next) => {
  try {
    const roles = await query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS permission_count,
              (SELECT COUNT(*) FROM admin_users au WHERE au.role_id = r.id) AS admin_count
       FROM roles r
       ORDER BY r.id`,
    );
    return ok(res, roles);
  } catch (err) { next(err); }
});

// POST /roles  新增角色
router.post('/roles',
  requireSuper,
  body('name').notEmpty().isLength({ max: 30 }).matches(/^[a-z_][a-z0-9_]*$/).withMessage('角色标识仅支持小写字母、数字和下划线'),
  body('label').notEmpty().isLength({ max: 30 }).withMessage('角色名称不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const { name, label, description } = req.body;

      // 检查标识是否已存在
      const [exist] = await query('SELECT id FROM roles WHERE name = ? LIMIT 1', [name]);
      if (exist) return res.status(400).json({ code: 400, msg: '角色标识已存在' });

      const [{ insertId }] = await query(
        'INSERT INTO roles (name, label, description) VALUES (?, ?, ?)',
        [name, label, description || null],
      );
      return ok(res, { id: insertId }, '角色创建成功');
    } catch (err) { next(err); }
  },
);

// GET /roles/:id  角色详情（含权限列表）
router.get('/roles/:id',
  requireSuper,
  param('id').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const [role] = await query('SELECT * FROM roles WHERE id = ? LIMIT 1', [req.params.id]);
      if (!role) return res.status(404).json({ code: 404, msg: '角色不存在' });

      // 获取该角色的所有权限
      const permissions = await query(
        `SELECT p.id, p.key, p.label, p.module
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = ?
         ORDER BY p.id`,
        [req.params.id],
      );

      return ok(res, { ...role, permissions });
    } catch (err) { next(err); }
  },
);

// PUT /roles/:id  编辑角色基本信息
router.put('/roles/:id',
  requireSuper,
  param('id').isInt({ min: 1 }),
  body('label').notEmpty().isLength({ max: 30 }),
  validate,
  async (req, res, next) => {
    try {
      const [role] = await query('SELECT * FROM roles WHERE id = ? LIMIT 1', [req.params.id]);
      if (!role) return res.status(404).json({ code: 404, msg: '角色不存在' });
      if (role.is_system && req.body.name && req.body.name !== role.name) {
        return res.status(400).json({ code: 400, msg: '系统内置角色不允许修改标识' });
      }

      const { label, description } = req.body;
      await query(
        'UPDATE roles SET label = COALESCE(?, label), description = COALESCE(?, description) WHERE id = ?',
        [label ?? null, description !== undefined ? description : null, req.params.id],
      );
      return ok(res, null, '角色更新成功');
    } catch (err) { next(err); }
  },
);

// DELETE /roles/:id  删除角色
router.delete('/roles/:id',
  requireSuper,
  param('id').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const [role] = await query('SELECT * FROM roles WHERE id = ? LIMIT 1', [req.params.id]);
      if (!role) return res.status(404).json({ code: 404, msg: '角色不存在' });
      if (role.is_system) return res.status(400).json({ code: 400, msg: '系统内置角色不允许删除' });

      // 检查是否有管理员关联此角色
      const [{ cnt }] = await query(
        'SELECT COUNT(*) AS cnt FROM admin_users WHERE role_id = ?',
        [req.params.id],
      );
      if (cnt > 0) return res.status(400).json({ code: 400, msg: `该角色下有 ${cnt} 位管理员，请先迁移后再删除` });

      await transaction(async conn => {
        await conn.execute('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
        await conn.execute('DELETE FROM roles WHERE id = ?', [req.params.id]);
      });
      return ok(res, null, '角色已删除');
    } catch (err) { next(err); }
  },
);

// ──────────────── 权限分配 ────────────────

// PUT /roles/:id/permissions  设置角色权限（全量替换）
router.put('/roles/:id/permissions',
  requireSuper,
  param('id').isInt({ min: 1 }),
  body('permissionIds').isArray().withMessage('permissionIds 必须为权限ID数组'),
  validate,
  async (req, res, next) => {
    try {
      const [role] = await query('SELECT * FROM roles WHERE id = ? LIMIT 1', [req.params.id]);
      if (!role) return res.status(404).json({ code: 404, msg: '角色不存在' });

      const { permissionIds } = req.body;

      await transaction(async conn => {
        // 先删除所有旧权限关联
        await conn.execute('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);

        // 再批量插入新权限
        if (permissionIds.length > 0) {
          const values = permissionIds.map(pid => [req.params.id, pid]);
          await conn.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
            [values],
          );
        }
      });

      return ok(res, null, `已为角色「${role.label}」分配 ${permissionIds.length} 项权限`);
    } catch (err) { next(err); }
  },
);

// GET /roles/:id/admins  查看拥有该角色的管理员
router.get('/roles/:id/admins',
  requireSuper,
  param('id').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const [role] = await query('SELECT * FROM roles WHERE id = ? LIMIT 1', [req.params.id]);
      if (!role) return res.status(404).json({ code: 404, msg: '角色不存在' });

      const admins = await query(
        'SELECT id, username, real_name, status, last_login, created_at FROM admin_users WHERE role_id = ? ORDER BY id',
        [req.params.id],
      );
      return ok(res, admins);
    } catch (err) { next(err); }
  },
);

module.exports = router;
