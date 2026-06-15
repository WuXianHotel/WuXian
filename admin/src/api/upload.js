import http from './http'

/**
 * 批量转换图片 URL 为本地路径（用于预览）
 * @param {string[]} urls - 需要转换的 URL 列表
 */
export const signUrls = (urls) =>
  http.post('/upload/sign-urls', { urls })

/**
 * 上传文件到服务器本地存储
 * @param {File} file - 文件对象
 * @param {string} prefix - 存储子目录，如 'room-images/', 'banners/'
 * @param {Function} onProgress - 进度回调（本地上传暂不支持，保留兼容）
 * @returns {string} 文件的可访问 URL
 */
export async function uploadToServer(file, prefix = 'room-images/', onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('prefix', prefix)

  const res = await http.post('/upload/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
    onUploadProgress: onProgress ? (e) => {
      if (e.total) onProgress(Math.round(e.progress * 100))
    } : undefined,
  })
  return res.data.url
}

// 保持向后兼容的别名（原 uploadToCos 调用处无需修改）
export { uploadToServer as uploadToCos }
