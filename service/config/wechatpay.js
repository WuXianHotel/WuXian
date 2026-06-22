'use strict';
const fs = require('fs');
const path = require('path');
const WechatPay = require('wechatpay-node-v3');
const logger = require('./logger');

// 读取本地证书 / 私钥文件，返回 Buffer（SDK v2 要求 Buffer 而非字符串）
function loadFileBuffer(envKey, required) {
  const filePath = process.env[envKey];
  if (!filePath) {
    if (required) throw new Error(envKey + ' 未配置');
    return null;
  }
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(absolutePath)) {
    if (required) throw new Error('文件不存在: ' + absolutePath);
    return null;
  }
  return fs.readFileSync(absolutePath);
}

let wxpay = null;

function getWxPay() {
  if (wxpay) return wxpay;

  const appid = process.env.WX_APPID;
  const mchid = process.env.WX_MCH_ID;
  const apiKey = process.env.WX_API_KEY;
  const serialNo = process.env.WX_MCH_SERIAL_NO;

  if (!mchid || mchid === 'dev_mch_id') {
    logger.warn('[wechatpay] 微信支付配置未填写');
    return null;
  }

  try {
    logger.info('[wechatpay] Step 1 读取商户私钥...');
    const privateKey = loadFileBuffer('WX_MCH_PRIVATE_KEY_PATH', true);
    logger.info('[wechatpay] Step 1 OK, len=' + privateKey.length);

    logger.info('[wechatpay] Step 2 读取商户证书(公钥)...');
    const publicKey = loadFileBuffer('WX_MCH_CERT_PATH', true);
    logger.info('[wechatpay] Step 2 OK, len=' + publicKey.length);

    logger.info('[wechatpay] Step 3 初始化SDK...');
    // SDK v2 构造器：{ appid, mchid, serial_no, publicKey, privateKey, key }
    wxpay = new WechatPay({
      appid: String(appid),
      mchid: String(mchid),
      serial_no: String(serialNo),
      publicKey: publicKey,
      privateKey: privateKey,
      key: String(apiKey),
    });
    logger.info('[wechatpay] Step 3 OK');

    logger.info('[wechatpay] 初始化成功 mchid=' + mchid);
    return wxpay;
  } catch (err) {
    logger.error('[wechatpay] 初始化失败 typeof=' + typeof err + ' keys=' + Object.keys(err || {}).join(',') + ' str=' + String(err) + ' stack=' + (err && err.stack));
    return null;
  }
}

// 小程序/JSAPI 预下单：返回值已包含 wx.requestPayment 所需字段（appId/timeStamp/nonceStr/package/signType/paySign）
async function jsapiPrepay(params) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');
  const result = await pay.transactions_jsapi({
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    amount: { total: params.total, currency: 'CNY' },
    payer: { openid: params.openid },
  });
  if (result.status === 200 && result.data && result.data.paySign) {
    return result.data;
  }
  throw new Error('预下单失败: ' + JSON.stringify(result));
}

// 兼容旧调用：基于 prepay_id 重新签名（实际推荐直接使用 jsapiPrepay 返回值）
function buildPayParams(prepayId) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');
  const appid = process.env.WX_APPID;
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = Math.random().toString(36).slice(2, 17);
  const packageVal = 'prepay_id=' + prepayId;
  const signStr = appid + '\n' + timeStamp + '\n' + nonceStr + '\n' + packageVal + '\n';
  const paySign = pay.sha256WithRsa(signStr);
  return { appId: appid, timeStamp: timeStamp, nonceStr: nonceStr, package: packageVal, signType: 'RSA', paySign: paySign };
}

// 验签 + 解密支付通知；SDK v2 的 verifySign 返回 Promise
async function verifyAndDecryptNotify(notifyBody, headers) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');
  const verified = await pay.verifySign({
    body: notifyBody,
    signature: headers['wechatpay-signature'],
    serial: headers['wechatpay-serial'],
    nonce: headers['wechatpay-nonce'],
    timestamp: headers['wechatpay-timestamp'],
  });
  if (!verified) throw new Error('通知签名验证失败');
  if (!notifyBody.resource || !notifyBody.resource.ciphertext) throw new Error('通知数据格式异常');
  const apiSecret = process.env.WX_API_KEY;
  const decrypted = pay.decipher_gcm(
    notifyBody.resource.ciphertext,
    notifyBody.resource.associated_data,
    notifyBody.resource.nonce,
    apiSecret,
  );
  try {
    return typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
  } catch (e) {
    throw new Error('解密后数据解析失败');
  }
}

module.exports = {
  getWxPay: getWxPay,
  jsapiPrepay: jsapiPrepay,
  buildPayParams: buildPayParams,
  verifyAndDecryptNotify: verifyAndDecryptNotify,
  get isAvailable() { return getWxPay() !== null; },
};
