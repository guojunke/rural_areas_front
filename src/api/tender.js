/**
 * 2.3 标段模块
 */
import request from '@/utils/request';

/** GET /api/tender/getTendersList  params: {projectId?}  ->  [{id, tenderName, projectId, company, leader, phone, standards, title, projectTypeList}] */
export function getTendersList (params) {
  return request({
    url: '/tender/getTendersList',
    method: 'get',
    params,
  });
}

/** POST /api/tender/add  data: {tenderName, projectId, company, leader, phone} */
export function addTender (data) {
  return request({
    url: '/tender/add',
    method: 'post',
    data,
  });
}

/** POST /api/tender/update  data: {id, tenderName, projectId, company, leader, phone} */
export function updateTender (data) {
  return request({
    url: '/tender/update',
    method: 'post',
    data,
  });
}

/** POST /api/tender/delete  data: {id} */
export function deleteTender (data) {
  return request({
    url: '/tender/delete',
    method: 'post',
    data,
  });
}
