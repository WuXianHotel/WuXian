'use strict';
/**
 * 管理后台操作日志中间件
 * 对 POST / PUT / PATCH / DELETE 请求自动记录到 admin_logs 表
 */
const { query } = require('../config/db');

// 需要记录日志的方法
const LOG_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// 路径 → 操作描述映射
const ACTION_MAP = [
  [/\/auth\/login$/,          'POST',   '管理员登录'],
  [/\/rooms$/,                'POST',   '新增房型'],
  [/\/rooms\/\d+$/,           'PUT',    '编辑房型'],
  [/\/rooms\/\d+$/,           'DELETE', '删除房型'],
  [/\/rooms\/\d+\/status$/,   'PATCH',  '修改房型状态'],
  [/\/rooms\/\d+\/rooms$/,    'POST',   '添加房间'],
  [/\/rooms\/\d+\/rooms\/\d+\/status$/, 'PATCH', '修改房间状态'],
  [/\/rooms\/\d+\/rooms\/\d+$/, 'DELETE', '删除房间'],
  [/\/orders\/.*\/checkin$/,  'PATCH',  '办理入住'],
  [/\/orders\/.*\/checkout$/, 'PATCH',  '办理退房'],
  [/\/orders\/.*\/cancel$/,   'PATCH',  '取消订单'],
  [/\/orders\/.*\/refund$/,   'PATCH',  '退款审核'],
  [/\/members\/\d+\/points$/, 'PATCH',  '调整会员积分'],
  [/\/members\/\d+\/wallet$/, 'PATCH',  '调整会员余额'],
  [/\/members\/\d+\/status$/, 'PATCH',  '修改会员状态'],
  [/\/members\/\d+$/,         'DELETE', '删除会员'],
  [/\/members\/levels$/,      'POST',   '新增会员等级'],
  [/\/members\/levels\/\d+$/, 'PUT',    '编辑会员等级'],
  [/\/members\/levels\/\d+$/, 'DELETE', '删除会员等级'],
  [/\/system\/settings$/,     'PUT',    '修改系统设置'],
  [/\/system\/admins$/,       'POST',   '新增管理员'],
  [/\/system\/admins\/\d+$/,  'PUT',    '编辑管理员'],
  [/\/system\/admins\/\d+\/status$/, 'PATCH', '修改管理员状态'],
  [/\/system\/admins\/\d+$/,  'DELETE', '删除管理员'],
  [/\/mall\/products$/,       'POST',   '新增积分商品'],
  [/\/mall\/products\/\d+$/,  'PUT',    '编辑积分商品'],
  [/\/mall\/products\/\d+$/,  'DELETE', '删除积分商品'],
  [/\/mall\/exchanges\/\d+$/, 'PATCH',  '处理兑换订单'],
];

function getAction(path, method) {
  for (const [pattern, m, desc] of ACTION_MAP) {
    if (method === m && pattern.test(path)) return desc;
  }
  return `${method} ${path}`;
}

// 脱敏：去掉密码等敏感字段
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const safe = { ...body };
  for (const key of ['password', 'secret', 'secretKey', 'token']) {
    if (key in safe) safe[key] = '***';
  }
  return safe;
}

/**
 * 日志记录中间件 — 挂载在 /api/admin 路由之后
 * 利用 res.on('finish') 在响应完成后异步写入
 */
function adminLogger(req, res, next) {
  if (!LOG_METHODS.has(req.method)) return next();

  // 登录接口没有 adminId，跳过
  if (req.path.endsWith('/auth/login')) return next();

  const startTime = Date.now();

  res.on('finish', () => {
    // 只记录成功的操作（2xx）
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    const adminId = req.adminId || 0;
    const adminName = req.adminName || 'unknown';
    const action = getAction(req.originalUrl.replace(/^\/api\/admin/, ''), req.method);
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';

    // 异步写入，不阻塞响应
    query(
      'INSERT INTO admin_logs (admin_id, admin_name, action, method, path, body, ip) VALUES (?,?,?,?,?,?,?)',
      [adminId, adminName, action, req.method, req.originalUrl, JSON.stringify(sanitizeBody(req.body)), ip],
    ).catch(() => {}); // 日志写入失败不影响业务
  });

  next();
}

module.exports = adminLogger;
