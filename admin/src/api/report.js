import http from './http'

export const getOverview  = (params) => http.get('/reports/overview', { params })
export const getDaily     = (params) => http.get('/reports/daily', { params })
export const getMonthly   = (params) => http.get('/reports/monthly', { params })
export const getRoomTypes = (params) => http.get('/reports/room-types', { params })
export const exportCsv    = (params) => http.get('/reports/export', { params, responseType: 'blob' })
