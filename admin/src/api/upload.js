import http from './http'

/**
 * 获取 COS 临时密钥
 * @param {string} prefix - 上传路径前缀，如 'room-images/', 'avatars/'
 */
export const getCosSign = (prefix = 'room-images/') =>
  http.post('/upload/cos-sign', { prefix })

/**
 * 上传文件到腾讯云 COS（直传，不经过 Node 服务器）
 * @param {File} file - 文件对象
 * @param {string} prefix - COS 路径前缀
 * @param {Function} onProgress - 进度回调 (percent: number)
 * @returns {string} 文件的 COS 公开 URL
 */
export async function uploadToCos(file, prefix = 'room-images/', onProgress) {
  // 1. 拿临时密钥
  const res = await getCosSign(prefix)
  const { credentials, bucket, region, cdnDomain } = res.data

  // 2. 生成唯一文件名
  const ext = file.name ? file.name.split('.').pop() : 'jpg'
  const key = `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  // 3. 直传 COS（PUT 方式）
  const cosUrl = `https://${bucket}.cos.${region}.myqcloud.com/${key}`

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', cosUrl, true)
    xhr.setRequestHeader('Authorization', buildCosAuth(credentials, 'put', `/${key}`, bucket, region))
    xhr.setRequestHeader('x-cos-security-token', credentials.sessionToken)
    xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg')

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100))
      }
    }
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`COS upload failed: ${xhr.status}`))
    xhr.onerror = () => reject(new Error('COS upload network error'))
    xhr.send(file)
  })

  // 4. 返回 CDN 域名 URL（确保带协议前缀）
  const domain = cdnDomain.startsWith('http') ? cdnDomain : `https://${cdnDomain}`
  return `${domain}/${key}`
}

/**
 * 简易 COS 请求签名（HMAC-SHA1）
 * 使用临时密钥签名，适用于 PUT Object
 */
function buildCosAuth(credentials, method, pathname, bucket, region) {
  const { tmpSecretId, tmpSecretKey } = credentials
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 900

  const qSignAlgorithm = 'sha1'
  const qAk = tmpSecretId
  const qSignTime = `${now};${exp}`
  const qKeyTime = qSignTime

  // SignKey = HMAC-SHA1(SecretKey, KeyTime)
  const signKey = hmacSha1(tmpSecretKey, qKeyTime)

  // HttpString
  const httpString = `${method}\n${pathname}\n\nhost=${bucket}.cos.${region}.myqcloud.com\n`

  // StringToSign
  const sha1HttpString = sha1(httpString)
  const stringToSign = `${qSignAlgorithm}\n${qSignTime}\n${sha1HttpString}\n`

  // Signature
  const signature = hmacSha1(signKey, stringToSign)

  return `q-sign-algorithm=${qSignAlgorithm}&q-ak=${qAk}&q-sign-time=${qSignTime}&q-key-time=${qKeyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`
}

function hmacSha1(key, data) {
  // Web Crypto 不支持同步 HMAC，用简易 JS 实现
  return CryptoJS_HmacSHA1(data, key)
}

function sha1(data) {
  return CryptoJS_SHA1(data)
}

// ── 内嵌极简 SHA1 / HMAC-SHA1（避免引入大库） ────────────────────────────────
// 基于标准 Web Crypto 同步 fallback
function CryptoJS_SHA1(msg) {
  const encoder = new TextEncoder()
  const data = encoder.encode(msg)
  // 简易同步 SHA1
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0
  const ml = data.length * 8
  const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64)
  padded.set(data)
  padded[data.length] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 4, ml)
  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Uint32Array(80)
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(offset + i * 4)
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16], 1)
    let a=h0,b=h1,c=h2,d=h3,e=h4
    for (let i = 0; i < 80; i++) {
      let f, k
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5A827999 }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1 }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC }
      else { f = b ^ c ^ d; k = 0xCA62C1D6 }
      const t = (rotl(a,5) + f + e + k + w[i]) >>> 0
      e = d; d = c; c = rotl(b, 30); b = a; a = t
    }
    h0 = (h0+a)>>>0; h1 = (h1+b)>>>0; h2 = (h2+c)>>>0; h3 = (h3+d)>>>0; h4 = (h4+e)>>>0
  }
  return [h0,h1,h2,h3,h4].map(v => v.toString(16).padStart(8,'0')).join('')
}

function CryptoJS_HmacSHA1(msg, key) {
  const encoder = new TextEncoder()
  let keyBytes = encoder.encode(key)
  if (keyBytes.length > 64) keyBytes = sha1Bytes(keyBytes)
  const iPad = new Uint8Array(64), oPad = new Uint8Array(64)
  for (let i = 0; i < 64; i++) {
    iPad[i] = (keyBytes[i] || 0) ^ 0x36
    oPad[i] = (keyBytes[i] || 0) ^ 0x5c
  }
  const inner = sha1Hex(concatBytes(iPad, encoder.encode(msg)))
  // outer hash
  const outerInput = new Uint8Array(64 + 20)
  outerInput.set(oPad)
  for (let i = 0; i < 20; i++) outerInput[64+i] = parseInt(inner.substr(i*2, 2), 16)
  return sha1BytesToHex(sha1Raw(outerInput))
}

function concatBytes(a, b) { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r }
function sha1Hex(bytes) { return sha1BytesToHex(sha1Raw(bytes)) }
function sha1BytesToHex(h) { return h.map(v => v.toString(16).padStart(8,'0')).join('') }
function sha1Bytes(data) { const h = sha1Raw(data); const r = new Uint8Array(20); const dv = new DataView(r.buffer); h.forEach((v,i)=>dv.setUint32(i*4,v)); return r }
function sha1Raw(data) {
  const ml = data.length * 8
  const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64)
  padded.set(data); padded[data.length] = 0x80
  const dv = new DataView(padded.buffer); dv.setUint32(padded.length - 4, ml)
  let h0=0x67452301,h1=0xEFCDAB89,h2=0x98BADCFE,h3=0x10325476,h4=0xC3D2E1F0
  for (let o = 0; o < padded.length; o += 64) {
    const w = new Uint32Array(80)
    for (let i=0;i<16;i++) w[i]=dv.getUint32(o+i*4)
    for (let i=16;i<80;i++) w[i]=rotl(w[i-3]^w[i-8]^w[i-14]^w[i-16],1)
    let a=h0,b=h1,c=h2,d=h3,e=h4
    for (let i=0;i<80;i++) {
      let f,k
      if(i<20){f=(b&c)|(~b&d);k=0x5A827999}else if(i<40){f=b^c^d;k=0x6ED9EBA1}else if(i<60){f=(b&c)|(b&d)|(c&d);k=0x8F1BBCDC}else{f=b^c^d;k=0xCA62C1D6}
      const t=(rotl(a,5)+f+e+k+w[i])>>>0;e=d;d=c;c=rotl(b,30);b=a;a=t
    }
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0
  }
  return [h0,h1,h2,h3,h4]
}
function rotl(v, n) { return ((v << n) | (v >>> (32 - n))) >>> 0 }
