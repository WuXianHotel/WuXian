'use strict';
/**
 * Mock 开关集中管理
 *
 * 设计原则：
 *   1. 生产环境（NODE_ENV=production）：所有 mock 强制关闭，环境变量无法覆盖
 *   2. 非生产环境：默认全部开启；可用环境变量逐项关闭（例如 MOCK_WX_LOGIN=false）
 *   3. 新增 mock 时，在这里加一行 flag + 在 .env.example 里加说明
 *
 * 使用：
 *   const mock = require('../config/mock');
 *   if (mock.wxLogin) { ... }
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * 解析环境变量开关：
 *   未设置        → defaultValue
 *   "false"/"0"  → false
 *   其他         → true
 */
function envFlag(key, defaultValue) {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultValue;
  return !['false', '0', 'off', 'no'].includes(String(v).toLowerCase());
}

// 总开关：生产环境永远 false；否则由 MOCK_ENABLED 控制（默认 true）
const masterEnabled = !isProd && envFlag('MOCK_ENABLED', true);

// 子项 flag 工厂：受总开关和自身 flag 同时控制
function sub(key, defaultValue = true) {
  return masterEnabled && envFlag(key, defaultValue);
}

const mock = {
  enabled: masterEnabled,

  // 微信登录：跳过真调用 code2Session，用 code 哈希当假 openid
  wxLogin: sub('MOCK_WX_LOGIN'),

  // 微信支付：/pay/create 返回 mock 预下单参数（paySign='MOCK_SIGN'）
  wxPay: sub('MOCK_WX_PAY'),

  // /pay/mock-paid 开发端点是否可用
  mockPaidEndpoint: sub('MOCK_PAID_ENDPOINT'),
};

/**
 * 启动时打印摘要。生产环境仅在有任何 mock 开启时打印 WARN 提醒。
 */
function report(logger) {
  const items = Object.entries(mock).filter(([k]) => k !== 'enabled');
  const enabled = items.filter(([, v]) => v).map(([k]) => k);
  const disabled = items.filter(([, v]) => !v).map(([k]) => k);

  if (isProd) {
    if (enabled.length) {
      (logger?.warn || console.warn)(
        `⚠️  [mock] 生产环境仍有 mock 开启: ${enabled.join(', ')}（不应出现，请排查）`,
      );
    } else {
      (logger?.info || console.log)('[mock] 生产环境，所有 mock 已关闭 ✅');
    }
    return;
  }

  (logger?.info || console.log)(
    `[mock] NODE_ENV=${process.env.NODE_ENV || 'development'}\n` +
    `       已启用: ${enabled.length ? enabled.join(', ') : '(无)'}\n` +
    `       已关闭: ${disabled.length ? disabled.join(', ') : '(无)'}`,
  );
}

module.exports = { ...mock, report, isProd };
