/**
 * 小程序端 COS 直传工具
 * 用法：const url = await uploadToCos(tempFilePath, 'avatars/')
 */
const api = require('./api')

/**
 * 上传临时文件到腾讯云 COS
 * @param {string} filePath - wx.chooseImage / chooseAvatar 返回的临时路径
 * @param {string} prefix - COS 路径前缀，如 'avatars/'
 * @returns {Promise<string>} COS 公开 URL
 */
async function uploadToCos(filePath, prefix) {
  prefix = prefix || 'avatars/'
  // 1. 获取临时密钥
  const signRes = await api.getCosSign(prefix)
  const { credentials, bucket, region, cdnDomain } = signRes.data

  // 2. 生成唯一 key
  const ext = filePath.split('.').pop() || 'jpg'
  const key = `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  // 3. 直传 COS（POST 方式，小程序用 wx.uploadFile）
  const cosUrl = `https://${bucket}.cos.${region}.myqcloud.com`

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: cosUrl,
      filePath,
      name: 'file',
      formData: {
        key,
        success_action_status: '200',
        'q-sign-algorithm': 'sha1',
        'q-ak': credentials.tmpSecretId,
        'q-key-time': `${Math.floor(Date.now()/1000)};${Math.floor(Date.now()/1000) + 900}`,
        'x-cos-security-token': credentials.sessionToken,
        policy: btoa(JSON.stringify({
          expiration: new Date(Date.now() + 900000).toISOString(),
          conditions: [
            { bucket },
            ['starts-with', '$key', prefix],
          ]
        }))
      },
      success(res) {
        if (res.statusCode === 200) {
          resolve(`${cdnDomain}/${key}`)
        } else {
          // POST 方式可能不适用于所有配置，回退用 PUT
          reject(new Error(`COS upload failed: ${res.statusCode}`))
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

module.exports = { uploadToCos }
