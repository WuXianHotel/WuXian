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

// ── 微信 access_token（带进程内缓存，2 小时）─────────────────────────────────
let _accessTokenCache = { token: '', expiresAt: 0 };
async function getWxAccessToken() {
  if (_accessTokenCache.token && Date.now() < _accessTokenCache.expiresAt) {
    return _accessTokenCache.token;
  }
  const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: {
      grant_type: 'client_credential',
      appid:      process.env.WX_APPID,
      secret:     process.env.WX_SECRET,
    },
    timeout: 5000,
  });
  if (data.errcode) throw Object.assign(new Error(data.errmsg), { status: 502 });
  _accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // 提前 5 分钟过期
  };
  return data.access_token;
}

// ── 用 getPhoneNumber 的 code 换真实手机号 ──────────────────────────────────
// 文档: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-info/phone-number/getPhoneNumber.html
async function getPhoneByCode(code) {
  if (mock.wxLogin) {
    // mock 模式返回假号，方便联调
    console.log('[getPhoneByCode] MOCK 模式，返回 13800000000');
    return '13800000000';
  }
  const accessToken = await getWxAccessToken();
  const { data } = await axios.post(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
    { code },
    { timeout: 5000 },
  );
  // 调试日志（不要打印 phoneNumber 明文，已脱敏）
  console.log('[getPhoneByCode] 微信返回:', {
    errcode: data.errcode,
    errmsg: data.errmsg,
    has_phone_info: !!data.phone_info,
  });

  if (data.errcode !== 0) {
    // 常见错误码：40029 invalid code（已使用/过期）；40097 参数错误；
    //            45011 频率超限；43104/41030 接口未开通
    throw Object.assign(
      new Error(`微信获取手机号失败: ${data.errmsg || ''} (errcode=${data.errcode})`),
      { status: 400 },
    );
  }
  const phone = data.phone_info && data.phone_info.purePhoneNumber;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    throw Object.assign(
      new Error(`微信返回的手机号格式异常: ${phone || '(空)'}`),
      { status: 502 },
    );
  }
  return phone;
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
// 支持两种方式：
//   1. 传 phoneCode（微信 getPhoneNumber 回调的 code） → 后端换取真实手机号【推荐】
//   2. 传 phone（明文手机号，仅供测试 / admin 迁移使用）
//
// 注意：用 optional({ values: 'falsy' }) 让空串/null 也能跳过校验，
//       否则前端误传 phone:'' 时会被 isMobilePhone 拦截。

// —— 调试中间件：在校验之前完整记录入参，用于定位「手机号格式不正确」这类问题 ——
function debugBindPhoneIn(req, _res, next) {
  console.log('━━━━━━━━━━━━━━━━ [bind-phone] IN ━━━━━━━━━━━━━━━━');
  console.log('[bind-phone] userId           =', req.userId);
  console.log('[bind-phone] Content-Type     =', req.headers['content-type']);
  console.log('[bind-phone] Content-Length   =', req.headers['content-length']);
  console.log('[bind-phone] req.body (raw)   =', JSON.stringify(req.body));
  console.log('[bind-phone] body keys        =', Object.keys(req.body || {}));
  const { phone, phoneCode } = req.body || {};
  console.log('[bind-phone] phone     typeof =', typeof phone,
              '| len =', typeof phone === 'string' ? phone.length : '-',
              '| value =', JSON.stringify(phone));
  console.log('[bind-phone] phoneCode typeof =', typeof phoneCode,
              '| len =', typeof phoneCode === 'string' ? phoneCode.length : '-',
              '| value =', JSON.stringify(phoneCode));
  next();
}

// —— 调试：把 express-validator 的校验结果也打出来 ——
function debugBindPhoneValidate(req, res, next) {
  const { validationResult } = require('express-validator');
  const result = validationResult(req);
  if (!result.isEmpty()) {
    console.log('[bind-phone] ❌ 校验失败:', JSON.stringify(result.array()));
    return res.status(400).json({
      code: 400,
      msg: '参数校验失败',
      errors: result.array().map(e => ({ field: e.path, msg: e.msg, value: e.value })),
    });
  }
  console.log('[bind-phone] ✅ 校验通过');
  next();
}

router.post('/bind-phone',
  mpAuth,
  debugBindPhoneIn,
  body('phoneCode').optional({ values: 'falsy' }).isString().withMessage('phoneCode 类型错误'),
  body('phone').optional({ values: 'falsy' }).isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  debugBindPhoneValidate,
  async (req, res, next) => {
    try {
      let { phone, phoneCode } = req.body;
      // 规范化空白
      if (typeof phone === 'string')     phone     = phone.trim();
      if (typeof phoneCode === 'string') phoneCode = phoneCode.trim();
      console.log('[bind-phone] after trim → phone =', JSON.stringify(phone),
                  ', phoneCode =', JSON.stringify(phoneCode));

      // 优先用 phoneCode 换取（生产环境正常路径）
      if (!phone && phoneCode) {
        console.log('[bind-phone] → 走 phoneCode 换取手机号路径');
        try {
          phone = await getPhoneByCode(phoneCode);
          console.log('[bind-phone] ← 微信返回手机号 (脱敏) =',
            phone ? phone.slice(0, 3) + '****' + phone.slice(-4) : '(空)');
        } catch (err) {
          console.error('[bind-phone] ❌ getPhoneByCode 抛错:', err.message);
          // 把微信错误透传给前端，便于排查
          return res.status(err.status || 400).json({
            code: err.status || 400,
            msg:  err.message || '获取手机号失败',
          });
        }
      } else {
        console.log('[bind-phone] → 直接使用入参 phone（未走微信换取）');
      }

      if (!phone) {
        console.log('[bind-phone] ❌ 最终 phone 为空');
        return res.status(400).json({ code: 400, msg: '请提供 phoneCode 或 phone' });
      }

      // 二次校验：避免任何路径下脏数据落库
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        console.log('[bind-phone] ❌ 手机号正则不通过, value =', JSON.stringify(phone));
        return res.status(400).json({ code: 400, msg: '手机号格式不正确' });
      }

      const [exist] = await query(
        'SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1',
        [phone, req.userId],
      );
      if (exist) {
        console.log('[bind-phone] ❌ 手机号已被 user_id =', exist.id, '占用');
        return res.status(409).json({ code: 409, msg: '该手机号已被其他账号绑定' });
      }

      await query('UPDATE users SET phone = ? WHERE id = ?', [phone, req.userId]);
      console.log('[bind-phone] ✅ 绑定成功, userId =', req.userId);
      return ok(res, { phone }, '手机号绑定成功');
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
  body('phone').optional().isLength({ max: 20 }),
  body('idType').optional().isInt({ min: 1, max: 4 }),
  body('idNumber').optional().isLength({ max: 30 }),
  validate,
  async (req, res, next) => {
    try {
      const { nickname, gender, realName, phone, idType, idNumber, avatarUrl } = req.body;
      await query(
        `UPDATE users SET
           nickname   = COALESCE(?, nickname),
           gender     = COALESCE(?, gender),
           real_name  = COALESCE(?, real_name),
           phone      = COALESCE(?, phone),
           id_type    = COALESCE(?, id_type),
           id_number  = COALESCE(?, id_number),
           avatar_url = COALESCE(?, avatar_url)
         WHERE id = ?`,
        [nickname ?? null, gender ?? null, realName ?? null, phone ?? null,
         idType ?? null, idNumber ?? null, avatarUrl ?? null, req.userId],
      );
      return ok(res, null, '更新成功');
    } catch (err) { next(err); }
  },
);

module.exports = router;
