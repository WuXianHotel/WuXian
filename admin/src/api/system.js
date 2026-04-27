import http from './http'

export const getSettings    = () => http.get('/system/settings')
export const saveSettings   = (settings) => http.put('/system/settings', { settings })
export const getAdmins      = (params) => http.get('/system/admins', { params })
export const createAdmin    = (data) => http.post('/system/admins', data)
export const updateAdmin    = (id, data) => http.put(`/system/admins/${id}`, data)
export const setAdminStatus = (id, data) => http.patch(`/system/admins/${id}/status`, data)
export const deleteAdmin    = (id) => http.delete(`/system/admins/${id}`)
export const getLogs        = (params) => http.get('/system/logs', { params })
