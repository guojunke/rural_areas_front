/**
 * 2.7 通知单模块（只读 + 删除，数据由移动端写入）
 */
import request from '@/utils/request';

/** GET /api/notice/getAllNoticeType  ->  ["开工通知", ...]；"全部"由前端自行前置 */
export function getAllNoticeType () {
  return request({
    url: '/notice/getAllNoticeType',
    method: 'get',
  });
}

/**
 * GET /api/notice/listNotice
 * @param {Object} params {projectId, tenderId, type, pageNum, pageSize}
 * -> 分页，行 {id, num, projectName, tenderName, type, proTypeName, content, fileNameList:[fileName]}
 */
export function listNotice (params) {
  return request({
    url: '/notice/listNotice',
    method: 'get',
    params,
  });
}

/** POST /api/notice/delete  data: {id} */
export function deleteNotice (data) {
  return request({
    url: '/notice/delete',
    method: 'post',
    data,
  });
}
