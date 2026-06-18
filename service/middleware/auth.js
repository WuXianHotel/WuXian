'use strict';
const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * 小程序用户鉴权中间件（含封禁检查）
 */
async function mpAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ code: 401, msg: '请先登录' });

  try {
    const payload = jwt.verify(token, process.env.MP_JWT_SECRET);
    req.userId = payload.userId;
    req.openid = payload.openid;
  } catch {
    return res.status(401).json({ code: 401, msg: 'Token 无效或已过期，请重新登录' });
  }

  // 检查用户是否被封禁
  const [user] = await query(
    'SELECT status FROM users WHERE id = ? LIMIT 1',
    [req.userId],
  );
  if (!user || user.status !== 1) {
    return res.status(403).json({ code: 403, msg: '账号已被封禁，请联系酒店客服' });
  }

  next();
}

/**
 * 管理后台鉴权中间件
 * @param {...string} roles 允许的角色列表（兼容旧的角色名鉴权），不传则所有角色均可
 *
 * 会注入 req.adminId / req.adminRole / req.adminRoleId / req.adminName
 * super 角色自动通过所有鉴权
 */
function adminAuth(...roles) {
  return async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ code: 401, msg: '请先登录' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    } catch {
      return res.status(401).json({ code: 401, msg: 'Token 无效或已过期，请重新登录' });
    }

    // 查询管理员信息（确认账号未被禁用）
    const [admin] = await query(
      'SELECT id, username, role, role_id, status FROM admin_users WHERE id = ? LIMIT 1',
      [payload.adminId],
    );
    if (!admin || admin.status !== 1) {
      return res.status(401).json({ code: 401, msg: '账号不存在或已被禁用' });
    }

    // super 角色自动通过所有鉴权
    if (admin.role === 'super') {
      req.adminId     = admin.id;
      req.adminRole   = admin.role;
      req.adminRoleId = admin.role_id;
      req.adminName   = admin.username;
      return next();
    }

    // 旧的基于角色名的鉴权（向后兼容）
    if (roles.length && !roles.includes(admin.role)) {
      return res.status(403).json({ code: 403, msg: '权限不足' });
    }

    req.adminId     = admin.id;
    req.adminRole   = admin.role;
    req.adminRoleId = admin.role_id;
    req.adminName   = admin.username;
    next();
  };
}

function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return req.query.token || null;
}

module.exports = { mpAuth, adminAuth };
