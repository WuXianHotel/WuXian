import http from './http'

export const getMallProducts   = (params) => http.get('/mall/products', { params })
export const createMallProduct = (data) => http.post('/mall/products', data)
export const updateMallProduct = (id, data) => http.put(`/mall/products/${id}`, data)
export const deleteMallProduct = (id) => http.delete(`/mall/products/${id}`)
export const getMallExchanges  = (params) => http.get('/mall/exchanges', { params })
export const updateExchange    = (id, data) => http.patch(`/mall/exchanges/${id}`, data)
