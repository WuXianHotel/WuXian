// utils/util.js

/**
 * 格式化日期 → "M月D日"
 */
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 格式化日期 → "M月D日(周X)"
 */
function formatDateWithDay(dateStr) {
  if (!dateStr) return ''
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`
}

/**
 * 计算两日期间隔天数
 */
function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const d1 = new Date(checkIn)
  const d2 = new Date(checkOut)
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

/**
 * 格式化价格 "¥1,234"
 */
function formatPrice(num) {
  if (num === undefined || num === null) return '¥0'
  return `¥${Number(num).toLocaleString()}`
}

/**
 * 获取今天 YYYY-MM-DD
 */
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 日期加N天，返回 YYYY-MM-DD
 */
function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 隐藏手机号中间4位
 */
function maskPhone(phone) {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 订单状态文字
 */
function orderStatusText(status) {
  const map = {
    pending_payment: '待支付',
    pending_checkin: '待入住',
    checked_in: '已入住',
    completed: '已完成',
    cancelled: '已取消',
    refund_pending: '退款中',
    refunded: '已退款'
  }
  return map[status] || status
}

/**
 * 订单状态颜色
 */
function orderStatusColor(status) {
  const map = {
    pending_payment: '#ff9800',
    pending_checkin: '#1a56db',
    checked_in: '#1a56db',
    completed: '#52c41a',
    cancelled: '#999',
    refund_pending: '#ff4d4f',
    refunded: '#999'
  }
  return map[status] || '#999'
}

module.exports = {
  formatDate,
  formatDateWithDay,
  calcNights,
  formatPrice,
  today,
  addDays,
  maskPhone,
  orderStatusText,
  orderStatusColor
}
