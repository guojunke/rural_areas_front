/**
 * 2.1 用户模块
 * 注意：登录/用户列表等接口在 legacy 里就带 /api，本系统所有模块都带 /api；
 * 由于 request.js 的 baseURL 已经是 /api，这里写的是去掉前缀后的路径。
 */
import request from '@/utils/request';

/** POST /api/user/login  ->  {token, id, username, mobile, roleId, roleName, projectId, tenderId} */
export function login (data) {
  return request({
    url: '/user/login',
    method: 'post',
    data, // {mobile, password}
  });
}

/** POST /api/user/getPages  ->  分页 {dataList, total}；行 {id,username,mobile,roleId,roleName,projectId,projectName,tenderId,tenderName} */
export function getPages (data) {
  return request({
    url: '/user/getPages',
    method: 'post',
    data, // {keyword, pageNum, pageSize}
  });
}

/** POST /api/user/create  data: {username, mobile, password?, roleId, projectId, tenderId} */
export function createUser (data) {
  return request({
    url: '/user/create',
    method: 'post',
    data,
  });
}

/** POST /api/user/update  data: {id, username, mobile, roleId, projectId, tenderId}（不含 password，改密码走 resetPassword） */
export function updateUser (data) {
  return request({
    url: '/user/update',
    method: 'post',
    data,
  });
}

/** POST /api/user/resetPassword  data: {id, password} —— legacy 用 update 兼职，契约拆成独立接口 */
export function resetPassword (data) {
  return request({
    url: '/user/resetPassword',
    method: 'post',
    data,
  });
}

/** POST /api/user/delete  data: {id} —— 契约把 legacy 的 /api/user/delete/${id} 改成请求体 */
export function deleteUser (data) {
  return request({
    url: '/user/delete',
    method: 'post',
    data,
  });
}

/** POST /api/user/getRole  ->  {"1":"超级管理员","2":"项目管理员","3":"现场人员"} */
export function getRole () {
  return request({
    url: '/user/getRole',
    method: 'post',
  });
}
