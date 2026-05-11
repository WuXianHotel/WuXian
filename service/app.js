'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const logger  = require('./config/logger');
const mock    = require('./config/mock');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ── 路由 ──────────────────────────────────────────────────────────────────────
// 小程序端
const mpAuthRouter      = require('./routes/mp/auth');
const mpRoomRouter      = require('./routes/mp/room');
const mpOrderRouter     = require('./routes/mp/order');
const mpPayRouter       = require('./routes/mp/pay');
const mpMemberRouter    = require('./routes/mp/member');
const mpReviewRouter    = require('./routes/mp/review');
const mpConfigRouter    = require('./routes/mp/config');
const mpWalletRouter    = require('./routes/mp/wallet');
const mpMallRouter      = require('./routes/mp/mall');
const mpUploadRouter    = require('./routes/mp/upload');

// 后台管理端
const adminAuthRouter   = require('./routes/admin/auth');
const adminRoomRouter   = require('./routes/admin/room');
const adminOrderRouter  = require('./routes/admin/order');
const adminPayRouter    = require('./routes/admin/pay');
const adminMemberRouter = require('./routes/admin/member');
const adminReportRouter = require('./routes/admin/report');
const adminSystemRouter = require('./routes/admin/system');
const adminMallRouter  = require('./routes/admin/mall');
const adminUploadRouter = require('./routes/admin/upload');

const app = express();

// ── 全局中间件 ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',')
    : '*',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传图片）
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// 请求日志
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ── 健康检查 ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── 挂载路由 ──────────────────────────────────────────────────────────────────
// 小程序
app.use('/api/mp/auth',    mpAuthRouter);
app.use('/api/mp/rooms',   mpRoomRouter);
app.use('/api/mp/orders',  mpOrderRouter);
app.use('/api/mp/pay',     mpPayRouter);
app.use('/api/mp/member',  mpMemberRouter);
app.use('/api/mp/reviews', mpReviewRouter);
app.use('/api/mp/config',  mpConfigRouter);
app.use('/api/mp/wallet',  mpWalletRouter);
app.use('/api/mp/mall',    mpMallRouter);
app.use('/api/mp/upload',  mpUploadRouter);

// 管理后台
const adminLogger = require('./middleware/adminLogger');
app.use('/api/admin', adminLogger);
app.use('/api/admin/auth',    adminAuthRouter);
app.use('/api/admin/rooms',   adminRoomRouter);
app.use('/api/admin/orders',  adminOrderRouter);
app.use('/api/admin/pay',     adminPayRouter);
app.use('/api/admin/members', adminMemberRouter);
app.use('/api/admin/reports', adminReportRouter);
app.use('/api/admin/system',  adminSystemRouter);
app.use('/api/admin/mall',    adminMallRouter);
app.use('/api/admin/upload',  adminUploadRouter);

// ── 错误处理 ──────────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── 启动 ──────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  logger.info(`🚀 服务已启动 → http://localhost:${PORT}  [${process.env.NODE_ENV}]`);
  mock.report(logger);
});

module.exports = app;
