import http from './http'

export const getBanners   = () => http.get('/banners')
export const createBanner = (data) => http.post('/banners', data)
export const updateBanner = (id, data) => http.put(`/banners/${id}`, data)
export const deleteBanner = (id) => http.delete(`/banners/${id}`)
