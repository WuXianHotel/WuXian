'use strict';
const logger = require('../config/logger');

function notFound(req, res) {
  res.status(404).json({ code: 404, msg: `接口不存在: ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  logger.error(err);

  // multer 文件错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: 400, msg: '文件大小超出限制' });
  }
  // express-validator 校验错误通常在路由层处理，这里兜底
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    code:    status,
    msg:     status === 500 ? '服务器内部错误' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
