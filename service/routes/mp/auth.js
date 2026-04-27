'use strict';
/**
 * 小程序端 · 认证
 * POST /api/mp/auth/login     微信一键登录（code换openid）
 * POST /api/mp/auth/bind-phone 绑定手机号
 * GET  /api/mp/auth/profile    获取当前用户信息
 * PUT  /api/mp/auth/profile    修改用户信息（昵称/头像/证件）
 */
const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const axios   = require('axios');
const { body } = require('express-validator');
const { query, transaction } = require('../../config/db');
const { mpAuth } = require('../../middleware/auth');
const { validate, ok } = require('../../middleware/helper');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const mock  = require('../../config/mock');

// ── 微信 code2Session ─────────────────────────────────────────────────────────
async function code2Session(code) {
  // 非生产 + MOCK_WX_LOGIN=true（默认）时，跳过真调用，用 code 生成稳定的假 openid
  if (mock.wxLogin) {
    const mockOpenid = 'mock_' + require('crypto').createHash('md5').update(code).digest('hex').slice(0, 24);
    console.log('[code2Session] MOCK 模式, openid=', mockOpenid);
    return { openid: mockOpenid, unionid: null, session_key: 'mock_session_key' };
  }
  const { data } = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
    params: {
      appid:      process.env.WX_APPID,
      secret:     process.env.WX_SECRET,
      js_code:    code,
      grant_type: 'authorization_code',
    },
    timeout: 5000,
  });
  if (data.errcode) throw Object.assign(new Error(data.errmsg), { status: 400 });
  return data; // { openid, unionid, session_key }
}

// ── 生成会员编号 ──────────────────────────────────────────────────────────────
async function genMemberNo() {
  const prefix = 'M' + dayjs().format('YYYYMM');
  const [row] = await query(
    "SELECT member_no FROM members WHERE member_no LIKE ? ORDER BY member_no DESC LIMIT 1",
    [`${prefix}%`]
  );
  const seq = row ? Number(row.member_no.slice(-6)) + 1 : 1;
  return prefix + String(seq).padStart(6, '0');
}

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login',
  body('code').notEmpty().withMessage('code 不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const { code, nickname, avatarUrl } = req.body;
      const wxData = await code2Session(code);
      const { openid, unionid } = wxData;

      // 查询或创建用户
      let [user] = await query('SELECT * FROM users WHERE openid = ? LIMIT 1', [openid]);
      if (!user) {
        await transaction(async conn => {
          await conn.execute(
            'INSERT INTO users (openid, unionid, nickname, avatar_url) VALUES (?,?,?,?)',
            [openid, unionid || null, nickname || null, avatarUrl || null],
          );
          const [{ id: userId }] = (await conn.execute('SELECT LAST_INSERT_ID() AS id'))[0];
          // 初始化会员记录
          const memberNo = await genMemberNo();
          await conn.execute(
            'INSERT INTO members (user_id, member_no, level) VALUES (?,?,1)',
            [userId, memberNo],
          );
        });
        [user] = await query('SELECT * FROM users WHERE openid = ? LIMIT 1', [openid]);
      }

      if (user.status !== 1) {
        return res.status(403).json({ code: 403, msg: '账号已被封禁' });
      }

      await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { userId: user.id, openid },
        process.env.MP_JWT_SECRET,
        { expiresIn: process.env.MP_JWT_EXPIRES_IN || '7d' },
      );

      return ok(res, { token, userId: user.id, nickname: user.nickname, avatarUrl: user.avatar_url });
    } catch (err) { next(err); }
  },
);

// ── POST /bind-phone ──────────────────────────────────────────────────────────
router.post('/bind-phone',
  mpAuth,
  body('phone').isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  validate,
  async (req, res, next) => {
    try {
      const { phone } = req.body;
      const [exist] = await query('SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1', [phone, req.userId]);
      if (exist) return res.status(400).json({ code: 400, msg: '该手机号已被其他账号绑定' });
      await query('UPDATE users SET phone = ? WHERE id = ?', [phone, req.userId]);
      return ok(res, null, '手机号绑定成功');
    } catch (err) { next(err); }
  },
);

// ── GET /profile ──────────────────────────────────────────────────────────────
router.get('/profile', mpAuth, async (req, res, next) => {
  try {
    const [user] = await query(
      `SELECT u.id, u.nickname, u.avatar_url, u.phone, u.real_name, u.gender,
              m.member_no, m.level, m.points, m.total_nights, ml.name AS level_name, ml.discount, ml.icon
       FROM users u
       LEFT JOIN members m ON m.user_id = u.id
       LEFT JOIN member_levels ml ON ml.level = m.level
       WHERE u.id = ? LIMIT 1`,
      [req.userId],
    );
    return ok(res, user);
  } catch (err) { next(err); }
});

// ── PUT /profile ──────────────────────────────────────────────────────────────
router.put('/profile',
  mpAuth,
  body('nickname').optional().isLength({ max: 30 }),
  body('gender').optional().isIn([0, 1, 2]),
  body('realName').optional().isLength({ max: 20 }),
  body('idType').optional().isIn([1, 2]),
  body('idNumber').optional().isLength({ max: 30 }),
  validate,
  async (req, res, next) => {
    try {
      const { nickname, gender, realName, idType, idNumber, avatarUrl } = req.body;
      await query(
        `UPDATE users SET
           nickname   = COALESCE(?, nickname),
           gender     = COALESCE(?, gender),
           real_name  = COALESCE(?, real_name),
           id_type    = COALESCE(?, id_type),
           id_number  = COALESCE(?, id_number),
           avatar_url = COALESCE(?, avatar_url)
         WHERE id = ?`,
        [nickname ?? null, gender ?? null, realName ?? null,
         idType ?? null, idNumber ?? null, avatarUrl ?? null, req.userId],
      );
      return ok(res, null, '更新成功');
    } catch (err) { next(err); }
  },
);

module.exports = router;
