'use strict';
const fs = require('fs');
const path = require('path');
const WechatPay = require('wechatpay-node-v3');
const x509 = require('@fidm/x509');
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

    // 预加载微信支付平台公钥 / 平台证书
    //   新商户号（2024年底后）：WX_PLATFORM_PUBLIC_KEY_PATH → 直接注入到证书缓存
    //   旧商户号：未配置时走 SDK 的 fetchCertificates 动态下载
    logger.info('[wechatpay] Step 4 预加载平台证书/公钥...');
    const envPath = process.env.WX_PLATFORM_PUBLIC_KEY_PATH;
    logger.info(`[wechatpay] Step 4 配置检查: WX_PLATFORM_PUBLIC_KEY_PATH=${envPath || '(未设置)'} WX_PLATFORM_KEY_SERIAL=${process.env.WX_PLATFORM_KEY_SERIAL || '(未设置)'}`);
    const platformPublicKey = loadFileBuffer('WX_PLATFORM_PUBLIC_KEY_PATH', false);

    if (platformPublicKey) {
      // 新机制：微信支付公钥（直接验签，无需调用 /v3/certificates）
      // 支持两种格式：
      //   1. X.509证书格式 -----BEGIN CERTIFICATE-----  自动提取序列号和公钥
      //   2. 裸公钥格式   -----BEGIN PUBLIC KEY-----      需要 WX_PLATFORM_KEY_SERIAL 指定序列号
      try {
        const pemStr = platformPublicKey.toString();
        const isCert = pemStr.includes('BEGIN CERTIFICATE');

        let serial;
        let publicKeyPem;

        if (isCert) {
          // X.509 证书格式：自动提取
          const cert = x509.Certificate.fromPEM(platformPublicKey);
          serial = cert.serialNumber.toUpperCase();
          publicKeyPem = cert.publicKey.toPEM();
        } else {
          // 裸公钥格式：需要手动指定序列号
          serial = process.env.WX_PLATFORM_KEY_SERIAL;
          if (!serial) {
            throw new Error('裸公钥格式需要配置 WX_PLATFORM_KEY_SERIAL（在微信商户平台公钥页面可查看序列号）');
          }
          serial = serial.toUpperCase();
          publicKeyPem = pemStr;
        }

        WechatPay.certificates = WechatPay.certificates || {};
        WechatPay.certificates[serial] = publicKeyPem;
        logger.info(`[wechatpay] Step 4 OK 平台公钥已缓存 serial=${serial} format=${isCert ? 'CERT' : 'PUBKEY'}`);
      } catch (err) {
        logger.error(`[wechatpay] Step 4 平台公钥解析失败: ${err && err.message}，将回退到动态下载`);
        fallbackFetchCerts(wxpay, apiKey);
      }
    } else {
      // 旧机制：动态下载平台证书
      logger.info('[wechatpay] Step 4 未配置平台公钥，使用传统平台证书下载方式');
      fallbackFetchCerts(wxpay, apiKey);
    }

    logger.info('[wechatpay] 初始化成功 mchid=' + mchid);
    return wxpay;
  } catch (err) {
    logger.error('[wechatpay] 初始化失败 typeof=' + typeof err + ' keys=' + Object.keys(err || {}).join(',') + ' str=' + String(err) + ' stack=' + (err && err.stack));
    return null;
  }
}

/**
 * 旧机制：通过 SDK 动态下载平台证书（新商户号返回 404，仅旧商户号可用）
 */
function fallbackFetchCerts(wxpay, apiKey) {
  const _originalFetch = wxpay.fetchCertificates.bind(wxpay);
  wxpay.fetchCertificates = async function (apiSecret) {
    const url = 'https://api.mch.weixin.qq.com/v3/certificates';
    try {
      await _originalFetch(apiSecret);
      logger.info('[wechatpay] fetchCertificates 成功，平台证书已缓存');
    } catch (err) {
      logger.error('[wechatpay] fetchCertificates 失败: ' + (err && err.message));
      try {
        const auth = this.buildAuthorization('GET', url);
        const hdrs = this.getHeaders(auth, { 'Content-Type': 'application/json' });
        const res = await this.httpService.get(url, hdrs);
        logger.error(
          `[wechatpay] ⚠️ 证书下载诊断：HTTP ${res.status} ` +
          `data=${JSON.stringify(res.data || {}).slice(0, 500)}`
        );
      } catch (e2) {
        logger.error(`[wechatpay] ⚠️ 证书下载诊断：网络请求异常 ${e2 && e2.message}`);
      }
      throw err;
    }
  };
  wxpay.fetchCertificates(String(apiKey)).then(() => {
    logger.info('[wechatpay] Step 4 OK 平台证书缓存成功');
  }).catch(err => {
    logger.error('[wechatpay] Step 4 预加载平台证书失败: ' + (err && err.message) + '，回调时将会重试下载');
  });
}

// 小程序/JSAPI 预下单：返回值已包含 wx.requestPayment 所需字段（appId/timeStamp/nonceStr/package/signType/paySign）
async function jsapiPrepay(params) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');
  let result;
  try {
    result = await pay.transactions_jsapi({
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      amount: { total: params.total, currency: 'CNY' },
      payer: { openid: params.openid },
    });
  } catch (err) {
    // SDK 内部抛错：网络问题 / 证书问题 / 签名问题
    logger.error('[wechatpay] transactions_jsapi 抛错 msg=' + (err && err.message) + ' stack=' + (err && err.stack));
    throw new Error('调用微信下单接口失败: ' + (err && err.message));
  }
  if (result && result.status === 200 && result.data && result.data.paySign) {
    return result.data;
  }
  // 微信返回的业务错误（status !== 200），打出 status/code/message 帮助定位
  const status = result && result.status;
  const data = result && result.data;
  logger.error('[wechatpay] 预下单返回异常 status=' + status + ' data=' + JSON.stringify(data));
  const wxMsg = (data && (data.message || data.code)) || '未知错误';
  throw new Error('微信下单失败[' + status + ']: ' + wxMsg);
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
// 重要：rawBody 必须是微信原始下行字符串，验签后再 JSON.parse 得到结构体
async function verifyAndDecryptNotify(rawBody, headers) {
  const pay = getWxPay();
  if (!pay) throw new Error('微信支付未初始化');

  const bodyStr = Buffer.isBuffer(rawBody)
    ? rawBody.toString('utf8')
    : (typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));

  const verified = await pay.verifySign({
    body: bodyStr,
    signature: headers['wechatpay-signature'],
    serial: headers['wechatpay-serial'],
    nonce: headers['wechatpay-nonce'],
    timestamp: headers['wechatpay-timestamp'],
    apiSecret: process.env.WX_API_KEY, // APIv3 密钥，用于解密平台证书
  }).catch(err => {
    // 验签/证书下载失败时输出更多诊断信息
    logger.error(
      `[wechatpay] verifySign 失败 msg=${err && err.message} ` +
      `serial=${headers['wechatpay-serial']} ` +
      `ts=${headers['wechatpay-timestamp']} ` +
      `bodyLen=${bodyStr.length}`
    );
    throw err;
  });
  if (!verified) throw new Error('通知签名验证失败');

  let notifyBody;
  try {
    notifyBody = JSON.parse(bodyStr);
  } catch (e) {
    throw new Error('通知报文 JSON 解析失败');
  }
  if (!notifyBody.resource || !notifyBody.resource.ciphertext) {
    throw new Error('通知数据格式异常');
  }

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
  // 诊断：直接请求微信证书下载接口，返回完整响应信息
  async diagnosticFetchCerts() {
    const pay = getWxPay();
    if (!pay) return { ok: false, error: '微信支付未初始化' };
    const url = 'https://api.mch.weixin.qq.com/v3/certificates';
    try {
      const auth = pay.buildAuthorization('GET', url);
      const hdrs = pay.getHeaders(auth, { 'Content-Type': 'application/json' });
      const res = await pay.httpService.get(url, hdrs);
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      // 检查静态缓存中已有的证书序列号
      const cachedCount = Object.keys(pay.constructor.certificates || {}).length;
      return {
        ok: res.status === 200,
        status: res.status,
        statusText: res.statusText || '',
        data: body.slice(0, 2000),
        cachedCertCount: cachedCount,
      };
    } catch (err) {
      return { ok: false, error: err && err.message, stack: err && err.stack };
    }
  },
};
