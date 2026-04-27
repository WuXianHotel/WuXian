import http from './http'

export const getOrderStats = () => http.get('/orders/stats')
export const getOrders     = (params) => http.get('/orders', { params })
export const getOrder      = (orderNo) => http.get(`/orders/${orderNo}`)
export const checkin       = (orderNo, data) => http.patch(`/orders/${orderNo}/checkin`, data)
export const checkout      = (orderNo) => http.patch(`/orders/${orderNo}/checkout`)
export const cancelOrder   = (orderNo, data) => http.patch(`/orders/${orderNo}/cancel`, data)
export const getRefund     = (orderNo) => http.get(`/orders/${orderNo}/refund`)
export const auditRefund   = (orderNo, data) => http.patch(`/orders/${orderNo}/refund`, data)
