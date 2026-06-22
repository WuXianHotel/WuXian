'use strict';
/**
 * 小程序端 · 支付
 * POST /api/mp/pay/prepay         发起微信支付预下单
 * POST /api/mp/pay/notify         微信支付回调（无鉴权，SDK验签）
 * GET  /api/mp/pay/status/:orderNo 查询支付状态
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { query, transaction } = require('../../config/db');
const { mpAuth } = require('../../middleware/auth');
const { validate, ok } = require('../../middleware/helper');
const logger = require('../../config/logger');
const mock   = require('../../config/mock');
const { checkLevelUpgrade } = require('../../middleware/levelCheck');
const { jsapiPrepay, verifyAndDecryptNotify, isAvailable } = require('../../config/wechatpay');

// ── POST /prepay | /create  发起预下单 ────────────────────────────────────────
router.post(['/prepay', '/create'],
  mpAuth,
  // 入参归一化：把 orderId 解析为 orderNo
  async (req, _res, next) => {
    try {
      const b = req.body || {};
      if (!b.orderNo && b.orderId != null) {
        const [row] = await query(
          'SELECT order_no FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
          [Number(b.orderId), req.userId],
        );
        if (row) b.orderNo = row.order_no;
      }
      next();
    } catch (err) { next(err); }
  },
  body('orderNo').notEmpty().withMessage('orderNo/orderId 不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const { orderNo } = req.body;
      const [order] = await query(
        'SELECT * FROM orders WHERE order_no = ? AND user_id = ? AND status = 0 LIMIT 1',
        [orderNo, req.userId],
      );
      if (!order) return res.status(400).json({ code: 400, msg: '订单不存在或已失效' });

      let payParams;
      if (mock.wxPay) {
        // Mock 模式：返回 mock 预下单参数
        payParams = {
          timeStamp: String(Math.floor(Date.now() / 1000)),
          nonceStr:  Math.random().toString(36).slice(2),
          package:   `prepay_id=mock_${orderNo}`,
          signType:  'RSA',
          paySign:   'MOCK_SIGN',
          orderNo,
        };
      } else if (isAvailable) {
        // 真实微信支付预下单
        const [roomType] = await query(
          'SELECT name FROM room_types WHERE id = ? LIMIT 1',
          [order.room_type_id],
        );
        const description = roomType?.name || '酒店订单';

        // 金额单位：元 → 分
        const totalFen = Math.round(Number(order.pay_amount) * 100);

        logger.info(`[pay] 预下单参数 orderNo=${orderNo} total=${totalFen} openid=${req.openid ? req.openid.slice(0, 6) + '***' : 'EMPTY'} notify=${process.env.WX_NOTIFY_URL}`);

        // SDK v2 直接返回 wx.requestPayment 所需字段
        const prepayResult = await jsapiPrepay({
          outTradeNo: orderNo,
          description,
          total: totalFen,
          openid: req.openid,
          notifyUrl: process.env.WX_NOTIFY_URL,
        });

        payParams = { ...prepayResult, orderNo };
      } else {
        return res.status(501).json({ code: 501, msg: '微信支付未配置' });
      }

      // 插入支付记录（处理中）
      await query(
        'INSERT INTO payments (order_no, user_id, amount, method, status) VALUES (?,?,?,?,0) ON DUPLICATE KEY UPDATE status=0',
        [orderNo, req.userId, order.pay_amount, 'wechat'],
      );

      return ok(res, payParams);
    } catch (err) {
      logger.error(`[pay] 预下单失败 msg=${err && err.message} stack=${err && err.stack}`);
      return res.status(500).json({ code: 500, msg: `预下单失败: ${err && err.message}` });
    }
  },
);

// ── POST /notify  微信支付回调 ────────────────────────────────────────────────
// V3 API 回调：签名验证 + AES-256-GCM 解密 + 幂等处理
// 注意：微信 V3 验签依赖原始字节流，因此本路由必须用 express.raw 接收，
// 不能复用全局的 express.json（会破坏字符顺序导致验签失败）。
router.post(
  '/notify',
  express.raw({ type: '*/*', limit: '2mb' }),
  async (req, res) => {
    try {
      const rawBuffer = req.body;

      // Mock 模式：直接解析原始 buffer 为对象
      if (mock.wxPay) {
        let parsed = rawBuffer;
        if (Buffer.isBuffer(rawBuffer)) {
          try { parsed = JSON.parse(rawBuffer.toString('utf8')); }
          catch (e) { parsed = {}; }
        }
        return handleNotifyBusiness(parsed, res);
      }

      // 真实模式：验签 + 解密
      if (!isAvailable) {
        logger.warn('[pay] 收到支付回调但微信支付未配置');
        return res.status(200).json({ code: 'FAIL', message: '微信支付未配置' });
      }

      const decrypted = await verifyAndDecryptNotify(rawBuffer, req.headers);
      logger.info(`[pay] 回调验签通过, out_trade_no=${decrypted.out_trade_no}`);

      return handleNotifyBusiness(decrypted, res);
    } catch (err) {
      logger.error('[pay] 支付回调处理失败:', err.message);
      // V3 通知要求返回 HTTP 200 + JSON
      return res.status(200).json({ code: 'FAIL', message: err.message });
    }
  },
);

/**
 * 支付回调业务处理（幂等）
 */
async function handleNotifyBusiness(notifyData, res) {
  const orderNo = notifyData.out_trade_no;
  if (!orderNo) {
    return res.status(200).json({ code: 'FAIL', message: '缺少订单号' });
  }

  const transactionId = notifyData.transaction_id || '';

  const [order] = await query(
    'SELECT id, pay_status, pay_amount, user_id FROM orders WHERE order_no = ? LIMIT 1',
    [orderNo],
  );

  // 订单不存在或已处理，直接返回成功（幂等）
  if (!order || order.pay_status === 1) {
    logger.info(`[pay] 回调幂等跳过: orderNo=${orderNo}`);
    return res.status(200).json({ code: 'SUCCESS' });
  }

  // 仅处理支付成功通知
  const tradeState = notifyData.trade_state || 'SUCCESS';
  if (tradeState !== 'SUCCESS') {
    logger.warn(`[pay] 支付状态非成功: orderNo=${orderNo}, trade_state=${tradeState}`);
    return res.status(200).json({ code: 'SUCCESS', message: `trade_state=${tradeState}` });
  }

  await transaction(async conn => {
    // 更新订单状态：已支付→待入住
    await conn.execute(
      'UPDATE orders SET status = 1, pay_status = 1 WHERE order_no = ? AND pay_status = 0',
      [orderNo],
    );
    // 更新支付记录
    await conn.execute(
      'UPDATE payments SET status = 1, transaction_id = ?, pay_at = NOW(), raw_notify = ? WHERE order_no = ?',
      [transactionId, JSON.stringify(notifyData), orderNo],
    );
    // 积分奖励（每消费1元得1积分）
    const points = Math.floor(Number(order.pay_amount));
    if (points > 0) {
      const [[{ balance }]] = await conn.execute(
        'SELECT points AS balance FROM members WHERE user_id = ?', [order.user_id],
      );
      const newBalance = (balance || 0) + points;
      await conn.execute(
        'UPDATE members SET points = ?, points_total = points_total + ?, total_amount = total_amount + ? WHERE user_id = ?',
        [newBalance, points, order.pay_amount, order.user_id],
      );
      await conn.execute(
        'INSERT INTO points_logs (user_id, type, points, balance, remark, ref_id) VALUES (?,?,?,?,?,?)',
        [order.user_id, 'earn', points, newBalance, '订单支付奖励积分', orderNo],
      );
    }
  });

  // 检查等级升级
  await checkLevelUpgrade(order.user_id).catch(err =>
    logger.error('[pay] 等级升级检查失败:', err)
  );

  logger.info(`[pay] 支付回调处理成功: orderNo=${orderNo}, transactionId=${transactionId}`);
  return res.status(200).json({ code: 'SUCCESS' });
}

// ── GET /status/:orderNo ──────────────────────────────────────────────────────
router.get('/status/:orderNo', mpAuth, async (req, res, next) => {
  try {
    const [order] = await query(
      'SELECT order_no, status, pay_status, pay_amount FROM orders WHERE order_no = ? AND user_id = ? LIMIT 1',
      [req.params.orderNo, req.userId],
    );
    if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
    return ok(res, { orderNo: order.order_no, status: order.status, payStatus: order.pay_status });
  } catch (err) { next(err); }
});

// ── POST /mock-paid  开发环境模拟支付成功 ───────────────────────────────────
// 由 config/mock.js 控制：生产环境或 MOCK_PAID_ENDPOINT=false 时返回 404，不暴露端点
router.post('/mock-paid', mpAuth,
  body('orderNo').notEmpty(),
  validate,
  async (req, res, next) => {
    if (!mock.mockPaidEndpoint) {
      return res.status(404).json({ code: 404, msg: 'not found' });
    }
    try {
      const { orderNo } = req.body;
      // 构造伪造通知，直接走 notify 的业务逻辑
      req.body = {
        out_trade_no: orderNo,
        transaction_id: 'MOCK_' + Date.now(),
      };
      // 直接调用 notify 处理器：把业务逻辑抽象出来太麻烦，这里复用代码路径
      const [order] = await query(
        'SELECT id, pay_status, pay_amount, user_id FROM orders WHERE order_no = ? AND user_id = ? LIMIT 1',
        [orderNo, req.userId],
      );
      if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
      if (order.pay_status === 1) return ok(res, null, '订单已支付');

      await transaction(async conn => {
        await conn.execute(
          'UPDATE orders SET status = 1, pay_status = 1 WHERE order_no = ? AND pay_status = 0',
          [orderNo],
        );
        await conn.execute(
          'UPDATE payments SET status = 1, transaction_id = ?, pay_at = NOW() WHERE order_no = ?',
          ['MOCK_' + Date.now(), orderNo],
        );
      });

      // 积分奖励（事务后处理，确保 levelCheck 可见）
      const pointsEarned = Math.floor(Number(order.pay_amount));
      if (pointsEarned > 0) {
        const [{ balance }] = await query(
          'SELECT points AS balance FROM members WHERE user_id = ?', [order.user_id],
        );
        const newBalance = balance + pointsEarned;
        await query(
          'UPDATE members SET points = ?, points_total = points_total + ?, total_nights = total_nights + (SELECT nights FROM orders WHERE order_no = ?), total_amount = total_amount + ? WHERE user_id = ?',
          [newBalance, pointsEarned, orderNo, order.pay_amount, order.user_id],
        );
        await query(
          'INSERT INTO points_logs (user_id, type, points, balance, remark, ref_id) VALUES (?,?,?,?,?,?)',
          [order.user_id, 'earn', pointsEarned, newBalance, '订单支付奖励积分(MOCK)', orderNo],
        );
      }

      // 检查等级升级
      const levelUp = await checkLevelUpgrade(req.userId);

      return ok(res, { orderNo, pointsEarned, levelUp }, 'mock paid');
    } catch (err) { next(err); }
  },
);

// ── POST /wallet  余额支付 ──────────────────────────────────────────────────
router.post('/wallet',
  mpAuth,
  body('orderNo').notEmpty().withMessage('orderNo 不能为空'),
  validate,
  async (req, res, next) => {
    try {
      const { orderNo } = req.body;
      const [order] = await query(
        'SELECT * FROM orders WHERE order_no = ? AND user_id = ? AND status = 0 LIMIT 1',
        [orderNo, req.userId],
      );
      if (!order) return res.status(400).json({ code: 400, msg: '订单不存在或已失效' });

      const payAmount = Number(order.pay_amount);

      await transaction(async conn => {
        // 1. 锁定用户行，检查余额
        const [[user]] = await conn.execute(
          'SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE', [req.userId],
        );
        const balance = Number(user.wallet_balance);
        if (balance < payAmount) {
          throw Object.assign(new Error(`余额不足，当前余额 ¥${balance.toFixed(2)}，需支付 ¥${payAmount.toFixed(2)}`), { status: 400 });
        }

        // 2. 扣减余额
        const newBalance = parseFloat((balance - payAmount).toFixed(2));
        await conn.execute('UPDATE users SET wallet_balance = ? WHERE id = ?', [newBalance, req.userId]);

        // 3. 写入钱包流水
        await conn.execute(
          'INSERT INTO wallet_logs (user_id, type, amount, balance, remark, ref_order_no) VALUES (?,?,?,?,?,?)',
          [req.userId, 'consume', -payAmount, newBalance, `订单支付 ${orderNo}`, orderNo],
        );

        // 4. 更新订单状态 → 已支付/待入住
        await conn.execute(
          'UPDATE orders SET status = 1, pay_status = 1 WHERE order_no = ? AND pay_status = 0',
          [orderNo],
        );

        // 5. 插入支付记录
        await conn.execute(
          'INSERT INTO payments (order_no, user_id, amount, method, status, transaction_id, pay_at) VALUES (?,?,?,?,1,?,NOW()) ON DUPLICATE KEY UPDATE status=1, method=?, transaction_id=?, pay_at=NOW()',
          [orderNo, req.userId, payAmount, 'wallet', `WALLET_${Date.now()}`, 'wallet', `WALLET_${Date.now()}`],
        );
      });

      // 积分奖励（事务结束后单独处理，确保积分变更对 levelCheck 可见）
      const pointsEarned = Math.floor(payAmount);
      if (pointsEarned > 0) {
        const [{ bal }] = await query(
          'SELECT points AS bal FROM members WHERE user_id = ?', [req.userId],
        );
        const newPointsBal = bal + pointsEarned;
        await query(
          'UPDATE members SET points = ?, points_total = points_total + ?, total_nights = total_nights + ?, total_amount = total_amount + ? WHERE user_id = ?',
          [newPointsBal, pointsEarned, order.nights, payAmount, req.userId],
        );
        await query(
          'INSERT INTO points_logs (user_id, type, points, balance, remark, ref_id) VALUES (?,?,?,?,?,?)',
          [req.userId, 'earn', pointsEarned, newPointsBal, '订单支付奖励积分', orderNo],
        );
      }

      // 检查等级升级
      const levelUp = await checkLevelUpgrade(req.userId);

      return ok(res, { orderNo, pointsEarned, levelUp }, '支付成功');
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ code: 400, msg: err.message });
      next(err);
    }
  },
);

module.exports = router;
