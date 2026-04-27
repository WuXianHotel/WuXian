'use strict';
const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * 小程序用户鉴权中间件
 */
function mpAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ code: 401, msg: '请先登录' });

  try {
    const payload = jwt.verify(token, process.env.MP_JWT_SECRET);
    req.userId   = payload.userId;
    req.openid   = payload.openid;
    next();
  } catch {
    return res.status(401).json({ code: 401, msg: 'Token 无效或已过期，请重新登录' });
  }
}

/**
 * 管理后台鉴权中间件
 * @param {...string} roles 允许的角色列表，不传则所有角色均可
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
      'SELECT id, username, role, status FROM admin_users WHERE id = ? LIMIT 1',
      [payload.adminId],
    );
    if (!admin || admin.status !== 1) {
      return res.status(401).json({ code: 401, msg: '账号不存在或已被禁用' });
    }
    if (roles.length && !roles.includes(admin.role)) {
      return res.status(403).json({ code: 403, msg: '权限不足' });
    }

    req.adminId   = admin.id;
    req.adminRole = admin.role;
    req.adminName = admin.username;
    next();
  };
}

function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return req.query.token || null;
}

module.exports = { mpAuth, adminAuth };
