'use strict';
/**
 * 微信支付 V3 API 配置模块
 * 使用 wechatpay-node-v3 SDK 封装签名、验签、解密
 *
 * 文档: https://github.com/klover2/wechatpay-node-v3
 */
const fs = require('fs');
const path = require('path');
const WechatPay = require('wechatpay-node-v3');
const logger = require('./logger');

const isProd = process.env.NODE_ENV === 'production';

// 读取商户私钥
function loadPrivateKey() {
  const keyPath = process.env.WX_MCH_PRIVATE_KEY_PATH;
  if (!keyPath) throw new Error('WX_MCH_PRIVATE_KEY_PATH 未配置');

  const absolutePath = path.isAbsolute(keyPath)
    ? keyPath
    : path.resolve(__dirname, '..', keyPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`商户私钥文件不存在: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

// 读取平台证书（首次使用后由 SDK 自动下载保存）
function loadPlatformCert() {
  const certPath = process.env.WX_PLATFORM_CERT_PATH;
  if (!certPath) return null;

  const absolutePath = path.isAbsolute(certPath)
    ? certPath
    : path.resolve(__dirname, '..', certPath);

  if (fs.existsSync(absolutePath)) {
    return fs.readFileSync(absolutePath, 'utf8');
  }
  return null;
}

// 单例
let wxpay = null;

function getWxPay() {
  if (wxpay) return wxpay;

  const mchid = process.env.WX_MCH_ID;
  const apiKey = process.env.WX_API_KEY;
  const serialNo = process.env.WX_MCH_SERIAL_NO;

  if (!mchid || mchid === 'dev_mch_id') {
    logger.warn('[wechatpay] 微信支付配置未填写（仍为开发占位），支付功能不可用');
    return null;
  }

  try {
    const privateKey = loadPrivateKey();
    const platformCert = loadPlatformCert();

    wxpay = new WechatPay({
      mchid: String(mchid),
      serial_no: String(serialNo),
      privateKey,
      apiKey: String(apiKey),
      certs: platformCert ? [platformCert] : [], // 预置平台证书，SDK 也可自动下载
    });

    logger.info(`[wechatpay] 微信支付初始化成功 (mchid=${mchid})`);
    return wxpay;
  } catch (err) {
    logger.error('[wechatpay] 微信支付初始化失败:', err.message || err, err.stack);
    return null;
  }
}

/**
 * JSAPI 预下单（小程序支付）
 * @param {object} params
 * @param {string} params.appid       小程序 AppID
 * @param {string} params.outTradeNo  商户订单号
 * @param {string} params.description 商品描述
 * @param {number} params.total       金额（单位：分）
 * @param {string} params.openid      用户 openid
 * @param {string} params.notifyUrl   回调地址
 * @returns {Promise<{prepay_id: string}>}
 */
async function jsapiPrepay(params) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');

  const result = await pay.transactions_jsapi({
    appid: params.appid,
    mchid: process.env.WX_MCH_ID,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    amount: {
      total: params.total,
      currency: 'CNY',
    },
    payer: {
      openid: params.openid,
    },
  });

  // result 包含 { prepay_id: 'wx...' }
  if (result.status === 200 || result.status === 202) {
    return result.data || result;
  }
  throw new Error(`预下单失败: ${JSON.stringify(result)}`);
}

/**
 * 构造小程序端 wx.requestPayment 所需参数
 * @param {string} prepayId 预下单返回的 prepay_id
 * @returns {{ timeStamp, nonceStr, package, signType, paySign }}
 */
function buildPayParams(prepayId) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');

  const appid = process.env.WX_APPID;
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = Math.random().toString(36).slice(2, 17);
  const packageVal = `prepay_id=${prepayId}`;

  // 待签名字符串
  const signStr = `${appid}\n${timeStamp}\n${nonceStr}\n${packageVal}\n`;

  // 使用 SDK 签名
  const paySign = pay._rsaSign(signStr);

  return {
    appId: appid,
    timeStamp,
    nonceStr,
    package: packageVal,
    signType: 'RSA',
    paySign,
  };
}

/**
 * 验证支付回调通知签名并解密数据
 * @param {object} notifyBody 回调请求体
 * @param {object} headers    回调请求头
 * @returns {object} 解密后的订单数据
 */
function verifyAndDecryptNotify(notifyBody, headers) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');

  // 1. 验签
  const verified = pay.verifySign({
    body: notifyBody,
    signature: headers['wechatpay-signature'],
    serial: headers['wechatpay-serial'],
    nonce: headers['wechatpay-nonce'],
    timestamp: headers['wechatpay-timestamp'],
  });

  if (!verified) {
    throw new Error('通知签名验证失败');
  }

  // 2. 解密 resource.ciphertext
  if (!notifyBody.resource || !notifyBody.resource.ciphertext) {
    throw new Error('通知数据格式异常');
  }

  const decrypted = pay.decrypt(notifyBody.resource.ciphertext);
  let data;
  try {
    data = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
  } catch {
    throw new Error('解密后数据解析失败');
  }

  return data;
}

module.exports = {
  getWxPay,
  jsapiPrepay,
  buildPayParams,
  verifyAndDecryptNotify,
  get isAvailable() { return getWxPay() !== null; },
};
