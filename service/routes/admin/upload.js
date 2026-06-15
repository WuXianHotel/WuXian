'use strict';
/**
 * 管理后台 · 文件上传
 * POST /api/admin/upload/file       上传文件到服务器
 * POST /api/admin/upload/sign-urls  批量转换图片 URL 为本地路径
 */
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { adminAuth } = require('../../middleware/auth');
const { ok } = require('../../middleware/helper');
const { UPLOAD_DIR, signUrls } = require('../../config/cos');

// 确保上传目录存在
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

// 配置 multer：按前缀分子目录
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const prefix = (req.body.prefix || 'uploads/').replace(/\/$/, '');
    const dir = path.join(UPLOAD_DIR, prefix);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ── POST /file  上传文件 ──────────────────────────────────────────────────────
router.post('/file', adminAuth(), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, msg: '请选择文件' });
  // 返回可访问的本地 URL
  const relativePath = req.file.path.replace(UPLOAD_DIR, '/uploads');
  const url = `https://wuxian-hotel.online${relativePath.replace(/\\/g, '/')}`;
  return ok(res, { url, path: relativePath.replace(/\\/g, '/'), filename: req.file.filename });
});

// ── POST /sign-urls  批量转换 URL 为本地路径 ──────────────────────────────────
router.post('/sign-urls', adminAuth(), (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls)) return res.status(400).json({ code: 400, msg: 'urls 须为数组' });
  return ok(res, signUrls(urls));
});

module.exports = router;
