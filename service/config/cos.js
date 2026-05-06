'use strict';
/**
 * 腾讯云 COS 配置 & 临时密钥 / 签名 URL 生成
 */
const STS = require('qcloud-cos-sts');
const crypto = require('crypto');

const cosConfig = {
  secretId:  process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket:    process.env.COS_BUCKET,
  region:    process.env.COS_REGION,
  get host() {
    return `${this.bucket}.cos.${this.region}.myqcloud.com`;
  },
  get cdnDomain() {
    return process.env.COS_CDN_DOMAIN || `https://${this.host}`;
  },
};

/**
 * 生成临时密钥（STS）用于上传
 */
async function getTempCredential(prefix = 'uploads/', durationSeconds = 1800) {
  const policy = {
    version: '2.0',
    statement: [{
      action: [
        'name/cos:PutObject',
        'name/cos:PostObject',
        'name/cos:InitiateMultipartUpload',
        'name/cos:ListMultipartUploads',
        'name/cos:ListParts',
        'name/cos:UploadPart',
        'name/cos:CompleteMultipartUpload',
      ],
      effect: 'allow',
      resource: [
        `qcs::cos:${cosConfig.region}:uid/${cosConfig.bucket.split('-').pop()}:${cosConfig.bucket}/${prefix}*`,
      ],
    }],
  };

  const result = await new Promise((resolve, reject) => {
    STS.getCredential({
      secretId:       cosConfig.secretId,
      secretKey:      cosConfig.secretKey,
      durationSeconds,
      policy,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  return {
    credentials: result.credentials,
    expiredTime: result.expiredTime,
    startTime:   result.startTime,
    bucket:      cosConfig.bucket,
    region:      cosConfig.region,
    cdnDomain:   cosConfig.cdnDomain,
    prefix,
  };
}

/**
 * 为单个 COS 对象生成带签名的临时访问 URL
 * @param {string} key - 对象 key，如 'room-images/xxx.jpg'
 * @param {number} expiresSec - 有效期秒数，默认 7 天（主账号密钥签名无 2h 上限）
 * @returns {string} 带签名的完整 URL
 */
function getSignedUrl(key, expiresSec = 7 * 24 * 3600) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresSec;
  const keyTime = `${now};${exp}`;

  const signKey = crypto.createHmac('sha1', cosConfig.secretKey).update(keyTime).digest('hex');
  const httpString = `get\n/${key}\n\nhost=${cosConfig.host}\n`;
  const sha1Http = crypto.createHash('sha1').update(httpString).digest('hex');
  const stringToSign = `sha1\n${keyTime}\n${sha1Http}\n`;
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');

  const auth = `q-sign-algorithm=sha1&q-ak=${cosConfig.secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`;

  return `https://${cosConfig.host}/${key}?${auth}`;
}

/**
 * 为上传（PUT Object）生成预签名 URL
 * 小程序端直接用 wx.uploadFile 走这个 URL，免去前端签名
 * @param {string} key - 对象 key
 * @param {number} expiresSec - 有效期秒数，默认 900（15分钟）
 * @returns {{ uploadUrl: string, publicUrl: string, key: string }}
 */
function getPutSignedUrl(key, expiresSec = 900) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresSec;
  const keyTime = `${now};${exp}`;

  const signKey = crypto.createHmac('sha1', cosConfig.secretKey).update(keyTime).digest('hex');
  const httpString = `put\n/${key}\n\nhost=${cosConfig.host}\n`;
  const sha1Http = crypto.createHash('sha1').update(httpString).digest('hex');
  const stringToSign = `sha1\n${keyTime}\n${sha1Http}\n`;
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');

  const auth = `q-sign-algorithm=sha1&q-ak=${cosConfig.secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`;

  return {
    uploadUrl: `https://${cosConfig.host}/${key}?${auth}`,
    publicUrl: `${cosConfig.cdnDomain}/${key}`,
    key,
  };
}

/**
 * 从完整 COS URL 中提取 key
 * 'https://bucket.cos.region.myqcloud.com/room-images/xxx.jpg' → 'room-images/xxx.jpg'
 */
function extractKeyFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
  } catch {
    // 可能已经是 key
    return url.startsWith('/') ? url.slice(1) : url;
  }
}

/**
 * 批量签名：传入 URL 或 key 列表，返回签名后的 URL 列表
 * 对已带签名的 URL 也会重新签名（防御过期数据），只跳过本地上传路径
 */
function signUrls(urls, expiresSec = 7 * 24 * 3600) {
  return (urls || []).map(url => {
    if (!url) return url;
    // 本地路径不处理
    if (url.startsWith('/uploads/') || url.startsWith('http://localhost')) {
      return url;
    }
    // 剥离旧签名，用 key 重新签
    const clean = url.split('?')[0];
    const key = extractKeyFromUrl(clean);
    return key ? getSignedUrl(key, expiresSec) : url;
  });
}

module.exports = { cosConfig, getTempCredential, getSignedUrl, getPutSignedUrl, extractKeyFromUrl, signUrls };
