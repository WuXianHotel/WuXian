import http from './http';

// 角色 CRUD
export const getRoles       = () => http.get('/roles');
export const getRoleDetail  = (id) => http.get(`/roles/${id}`);
export const createRole     = (data) => http.post('/roles', data);
export const updateRole     = (id, data) => http.put(`/roles/${id}`, data);
export const deleteRole     = (id) => http.delete(`/roles/${id}`);

// 权限分配
export const setRolePermissions = (id, permissionIds) => http.put(`/roles/${id}/permissions`, { permissionIds });
export const getRoleAdmins      = (id) => http.get(`/roles/${id}/admins`);

// 权限定义
export const getPermissions     = () => http.get('/permissions');

// 当前用户权限
export const getMyPermissions   = () => http.get('/my-permissions');
