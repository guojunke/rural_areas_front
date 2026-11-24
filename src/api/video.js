/**
 * 2.8 现场影音模块
 * 类型固定两项：施工技术及要求、现场视频及图片（与 legacy 保持一致，前端硬编码）。
 */
import request from '@/utils/request';

/** GET /api/video/listVideoData  params: {date, type, pageNum, pageSize}  ->  分页，行 {id, gmtCreate, title, type, remark, fileNameList} */
export function listVideoData (params) {
  return request({
    url: '/video/listVideoData',
    method: 'get',
    params,
  });
}

/**
 * POST /api/video/add （multipart）
 * @param {Object} payload {title, type, remark, files} —— files 为 File/Blob 数组
 * 契约把 legacy 的 1 基字段名 file1..fileN 统一为同名多部件 files，对应后端 MultipartFile[] files。
 */
export function addVideo (payload = {}) {
  const { title, type, remark, files = [] } = payload;
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  const fields = { title, type, remark };
  Object.keys(fields).forEach((key) => {
    const value = fields[key];
    if (value === undefined || value === null || value === '') return;
    formData.append(key, value);
  });
  return request({
    url: '/video/add',
    method: 'post',
    data: formData,
  });
}

/** POST /api/video/delete  data: {id} */
export function deleteVideo (data) {
  return request({
    url: '/video/delete',
    method: 'post',
    data,
  });
}
