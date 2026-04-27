import http from './http'

export const login = (data) => http.post('/auth/login', data)
export const getMe = () => http.get('/auth/me')
export const changePassword = (data) => http.put('/auth/password', data)
