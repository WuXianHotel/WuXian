'use strict';
const fs = require('fs');
const path = require('path');
const WechatPay = require('wechatpay-node-v3');
const logger = require('./logger');

function loadPrivateKey() {
  const keyPath = process.env.WX_MCH_PRIVATE_KEY_PATH;
  if (!keyPath) throw new Error('WX_MCH_PRIVATE_KEY_PATH 未配置');
  const absolutePath = path.isAbsolute(keyPath)
    ? keyPath
    : path.resolve(__dirname, '..', keyPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error('商户私钥文件不存在: ' + absolutePath);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

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

let wxpay = null;

function getWxPay() {
  if (wxpay) return wxpay;

  const mchid = process.env.WX_MCH_ID;
  const apiKey = process.env.WX_API_KEY;
  const serialNo = process.env.WX_MCH_SERIAL_NO;

  if (!mchid || mchid === 'dev_mch_id') {
    logger.warn('[wechatpay] 微信支付配置未填写');
    return null;
  }

  try {
    logger.info('[wechatpay] Step 1 读取私钥...');
    const privateKey = loadPrivateKey();
    logger.info('[wechatpay] Step 1 OK, len=' + privateKey.length);

    logger.info('[wechatpay] Step 2 平台证书...');
    const platformCert = loadPlatformCert();
    logger.info('[wechatpay] Step 2 OK, cert=' + (platformCert ? 'loaded' : 'auto'));

    logger.info('[wechatpay] Step 3 初始化SDK...');
    wxpay = new WechatPay({
      mchid: String(mchid),
      serial_no: String(serialNo),
      privateKey: privateKey,
      apiKey: String(apiKey),
      certs: platformCert ? [platformCert] : [],
    });
    logger.info('[wechatpay] Step 3 OK');

    logger.info('[wechatpay] 初始化成功 mchid=' + mchid);
    return wxpay;
  } catch (err) {
    logger.error('[wechatpay] 初始化失败 typeof=' + typeof err + ' keys=' + Object.keys(err || {}).join(',') + ' str=' + String(err));
    return null;
  }
}

async function jsapiPrepay(params) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');
  const result = await pay.transactions_jsapi({
    appid: params.appid,
    mchid: process.env.WX_MCH_ID,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    amount: { total: params.total, currency: 'CNY' },
    payer: { openid: params.openid },
  });
  if (result.status === 200 || result.status === 202) return result.data || result;
  throw new Error('预下单失败: ' + JSON.stringify(result));
}

function buildPayParams(prepayId) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');
  const appid = process.env.WX_APPID;
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = Math.random().toString(36).slice(2, 17);
  const packageVal = 'prepay_id=' + prepayId;
  const signStr = appid + '\n' + timeStamp + '\n' + nonceStr + '\n' + packageVal + '\n';
  const paySign = pay._rsaSign(signStr);
  return { appId: appid, timeStamp: timeStamp, nonceStr: nonceStr, package: packageVal, signType: 'RSA', paySign: paySign };
}

function verifyAndDecryptNotify(notifyBody, headers) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');
  const verified = pay.verifySign({
    body: notifyBody,
    signature: headers['wechatpay-signature'],
    serial: headers['wechatpay-serial'],
    nonce: headers['wechatpay-nonce'],
    timestamp: headers['wechatpay-timestamp'],
  });
  if (!verified) throw new Error('通知签名验证失败');
  if (!notifyBody.resource || !notifyBody.resource.ciphertext) throw new Error('通知数据格式异常');
  const decrypted = pay.decrypt(notifyBody.resource.ciphertext);
  try { return typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted; }
  catch (e) { throw new Error('解密后数据解析失败'); }
}

module.exports = {
  getWxPay: getWxPay,
  jsapiPrepay: jsapiPrepay,
  buildPayParams: buildPayParams,
  verifyAndDecryptNotify: verifyAndDecryptNotify,
  get isAvailable() { return getWxPay() !== null; },
};
