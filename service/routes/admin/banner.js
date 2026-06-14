'use strict';
/**
 * 管理后台 · Banner 轮播图管理
 * GET    /api/admin/banners         列表
 * POST   /api/admin/banners         新增
 * PUT    /api/admin/banners/:id     编辑
 * DELETE /api/admin/banners/:id     删除
 */
const router = require('express').Router();
const { body } = require('express-validator');
const { query } = require('../../config/db');
const { adminAuth } = require('../../middleware/auth');
const { validate, ok } = require('../../middleware/helper');
const { signUrls } = require('../../config/cos');

// ── GET /  列表 ────────────────────────────────────────────────────────────────
router.get('/', adminAuth(), async (req, res, next) => {
  try {
    const list = await query(
      'SELECT * FROM banners ORDER BY sort_order ASC, id DESC',
    );
    // 签名图片 URL，确保 COS 图片可在管理后台预览
    const signed = list.map(item => ({
      ...item,
      image: signUrls([item.image])[0],
    }));
    return ok(res, signed);
  } catch (err) { next(err); }
});

// ── POST /  新增 ───────────────────────────────────────────────────────────────
router.post('/',
  adminAuth('super', 'operation'),
  body('image').notEmpty().withMessage('图片地址不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const f = req.body;
      await query(
        `INSERT INTO banners (image, title, link_url, sort_order, status)
         VALUES (?,?,?,?,?)`,
        [f.image, f.title || null, f.linkUrl || null, f.sortOrder || 0, f.status ?? 1],
      );
      return ok(res, null, 'Banner 创建成功');
    } catch (err) { next(err); }
  },
);

// ── PUT /:id  编辑 ─────────────────────────────────────────────────────────────
router.put('/:id',
  adminAuth('super', 'operation'),
  body('image').notEmpty().withMessage('图片地址不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const f = req.body;
      await query(
        `UPDATE banners SET
           image = ?, title = ?, link_url = ?,
           sort_order = ?, status = ?
         WHERE id = ?`,
        [f.image, f.title || null, f.linkUrl || null,
         f.sortOrder || 0, f.status ?? 1, req.params.id],
      );
      return ok(res, null, 'Banner 更新成功');
    } catch (err) { next(err); }
  },
);

// ── DELETE /:id  删除 ──────────────────────────────────────────────────────────
router.delete('/:id', adminAuth('super'), async (req, res, next) => {
  try {
    await query('DELETE FROM banners WHERE id = ?', [req.params.id]);
    return ok(res, null, 'Banner 已删除');
  } catch (err) { next(err); }
});

module.exports = router;
