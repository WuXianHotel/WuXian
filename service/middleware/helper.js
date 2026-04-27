'use strict';
const { validationResult } = require('express-validator');

/**
 * 在路由末尾调用，自动读取 express-validator 校验结果并返回 400
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code:   400,
      msg:    '参数校验失败',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
}

/**
 * 统一分页参数解析
 * 返回 { page, pageSize, offset }
 */
function parsePager(query) {
  const page     = Math.max(1, parseInt(query.page     || '1',  10));
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/**
 * 统一成功响应
 */
function ok(res, data = null, msg = 'ok') {
  return res.json({ code: 0, msg, data });
}

/**
 * 统一分页响应
 */
function page(res, { list, total, page: p, pageSize }) {
  return res.json({
    code: 0, msg: 'ok',
    data: { list, total, page: p, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

module.exports = { validate, parsePager, ok, page };
