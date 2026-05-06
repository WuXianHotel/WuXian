/**
 * 小程序端 COS 直传工具
 * 用法：const url = await uploadToCos(tempFilePath, 'avatars/')
 *
 * 实现原理：
 *   1) 请求后端 /api/mp/upload/put-sign 拿到预签名 URL（PUT）
 *   2) 用 wx.uploadFile 走该 URL，COS 直接校验签名
 *   3) 成功后返回 publicUrl（https://host/key，不带签名）
 */
const api = require('./api')

async function uploadToCos(filePath, prefix) {
  prefix = prefix || 'avatars/'
  const ext = (filePath.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)

  // 1. 拿预签名 PUT URL
  const signRes = await api.getPutSign({ prefix, ext })
  const { uploadUrl, publicUrl } = signRes.data || {}
  if (!uploadUrl || !publicUrl) {
    throw new Error('获取上传签名失败')
  }

  // 2. 用 wx.uploadFile 走预签名 URL 上传
  //    注意：wx.uploadFile 是 multipart/form-data，而 COS PUT 需要原始 body
  //    所以我们用 wx.request + readFileSync 读取文件 ArrayBuffer 来发 PUT
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      success: (res) => {
        wx.request({
          url: uploadUrl,
          method: 'PUT',
          data: res.data, // ArrayBuffer
          header: {
            'content-type': 'application/octet-stream',
          },
          success: (r) => {
            if (r.statusCode >= 200 && r.statusCode < 300) {
              resolve(publicUrl)
            } else {
              console.error('[uploadToCos] COS 返回错误', r.statusCode, r.data)
              reject(new Error(`COS upload failed: ${r.statusCode}`))
            }
          },
          fail: (err) => {
            console.error('[uploadToCos] 网络错误', err)
            reject(err)
          }
        })
      },
      fail: (err) => {
        console.error('[uploadToCos] 读取文件失败', err)
        reject(err)
      }
    })
  })
}

module.exports = { uploadToCos }
