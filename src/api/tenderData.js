/**
 * 2.9 标段资料模块
 * 类型固定五项：开工资料、过程资料、竣工资料、付款资料、验收资料。
 * 注意 legacy 用的路径是 /tendersData/*，契约统一为 /tenderData/*。
 */
import request from '@/utils/request';

/** GET /api/tenderData/listTenderData  params: {date, projectId, tenderId, type, pageNum, pageSize}  ->  分页，行 {id, gmtCreate, title, type, remark, projectName, tenderName, fileNameList} */
export function listTenderData (params) {
  return request({
    url: '/tenderData/listTenderData',
    method: 'get',
    params,
  });
}

/**
 * POST /api/tenderData/add （multipart）
 * @param {Object} payload {title, projectId, tenderId, type, remark, files} —— files 为 File/Blob 数组，以同名多部件 files 提交
 */
export function addTenderData (payload = {}) {
  const { title, projectId, tenderId, type, remark, files = [] } = payload;
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  const fields = { title, projectId, tenderId, type, remark };
  Object.keys(fields).forEach((key) => {
    const value = fields[key];
    if (value === undefined || value === null || value === '') return;
    formData.append(key, value);
  });
  return request({
    url: '/tenderData/add',
    method: 'post',
    data: formData,
  });
}

/** POST /api/tenderData/delete  data: {id} */
export function deleteTenderData (data) {
  return request({
    url: '/tenderData/delete',
    method: 'post',
    data,
  });
}
