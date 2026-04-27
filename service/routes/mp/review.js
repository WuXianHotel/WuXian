'use strict';
/**
 * 小程序端 · 评价
 * POST /api/mp/reviews          提交评价
 * GET  /api/mp/reviews/:roomTypeId 获取某房型评价列表
 */
const router = require('express').Router();
const { body } = require('express-validator');
const { query } = require('../../config/db');
const { mpAuth } = require('../../middleware/auth');
const { validate, parsePager, ok, page } = require('../../middleware/helper');
const upload = require('../../middleware/upload');

// ── POST /  提交评价 ──────────────────────────────────────────────────────────
router.post('/',
  mpAuth,
  body('orderNo').notEmpty(),
  body('score').isInt({ min: 1, max: 5 }),
  body('content').optional().isLength({ max: 1000 }),
  validate,
  async (req, res, next) => {
    try {
      const { orderNo, score, content, isAnonymous, images } = req.body;

      // 校验订单归属且状态为已退房
      const [order] = await query(
        'SELECT id, room_type_id FROM orders WHERE order_no = ? AND user_id = ? AND status = 3 LIMIT 1',
        [orderNo, req.userId],
      );
      if (!order) return res.status(400).json({ code: 400, msg: '订单不存在或未完成入住，无法评价' });

      // 是否已评价
      const [exist] = await query('SELECT id FROM reviews WHERE order_no = ? LIMIT 1', [orderNo]);
      if (exist) return res.status(400).json({ code: 400, msg: '该订单已评价' });

      await query(
        `INSERT INTO reviews (order_no, user_id, room_type_id, score, content, images, is_anonymous)
         VALUES (?,?,?,?,?,?,?)`,
        [orderNo, req.userId, order.room_type_id, score, content || null,
         JSON.stringify(images || []), isAnonymous ? 1 : 0],
      );

      // 更新房型评分
      await query(
        `UPDATE room_types SET
           review_count = review_count + 1,
           rating = (SELECT ROUND(AVG(score),1) FROM reviews WHERE room_type_id = ? AND status = 1)
         WHERE id = ?`,
        [order.room_type_id, order.room_type_id],
      );

      return ok(res, null, '评价提交成功，感谢您的反馈');
    } catch (err) { next(err); }
  },
);

// ── GET /:roomTypeId  房型评价列表 ────────────────────────────────────────────
router.get('/:roomTypeId', async (req, res, next) => {
  try {
    const { pageSize, offset, page: p } = parsePager(req.query);
    const { score } = req.query;
    const conditions = ['rv.room_type_id = ?', 'rv.status = 1'];
    const params = [req.params.roomTypeId];

    if (score) { conditions.push('rv.score = ?'); params.push(Number(score)); }
    const where = 'WHERE ' + conditions.join(' AND ');

    const [[{ total }], list] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM reviews rv ${where}`, params),
      query(
        `SELECT rv.id, rv.score, rv.content, rv.images, rv.reply, rv.reply_at, rv.created_at,
                IF(rv.is_anonymous,'匿名用户',u.nickname) AS nickname,
                IF(rv.is_anonymous,NULL,u.avatar_url)    AS avatarUrl
         FROM reviews rv LEFT JOIN users u ON u.id = rv.user_id
         ${where} ORDER BY rv.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return page(res, { list, total, page: p, pageSize });
  } catch (err) { next(err); }
});

module.exports = router;
