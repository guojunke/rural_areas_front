/**
 * 2.2 项目区模块（层级：项目区 -> 标段 -> 工程量）
 */
import request from '@/utils/request';

/** GET /api/project/getProjectList  ->  [{id, projectName}] */
export function getProjectList () {
  return request({
    url: '/project/getProjectList',
    method: 'get',
  });
}

/**
 * GET /api/project/getBackendProjectIndex
 * @param {Object} [params] {projectId?, tenderId?}
 * 一次返回 项目区 -> 标段(tenderList) -> 工程量(projectTypeList) 整棵树，供工程量管理页渲染。
 */
export function getBackendProjectIndex (params) {
  return request({
    url: '/project/getBackendProjectIndex',
    method: 'get',
    params,
  });
}

/** POST /api/project/add  data: {projectName} */
export function addProject (data) {
  return request({
    url: '/project/add',
    method: 'post',
    data,
  });
}

/** POST /api/project/update  data: {id, projectName} */
export function updateProject (data) {
  return request({
    url: '/project/update',
    method: 'post',
    data,
  });
}

/** POST /api/project/delete  data: {id} */
export function deleteProject (data) {
  return request({
    url: '/project/delete',
    method: 'post',
    data,
  });
}
