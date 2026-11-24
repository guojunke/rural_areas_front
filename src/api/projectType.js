/**
 * 2.4 工程量模块
 * 字段命名按契约 1.4：projectId / tenderId / description（不再用 proId、tendersId、desc）。
 */
import request from '@/utils/request';

/** GET /api/projectType/getAllProjectType  ->  {WELL:"井", ROAD:"路", BRIDGE:"桥", DAM:"坝", POOL:"塘", GREEN:"绿化", ELEC:"电", SMART:"智能", OTHER:"其他"} */
export function getAllProjectType () {
  return request({
    url: '/projectType/getAllProjectType',
    method: 'get',
  });
}

/** GET /api/projectType/getByTenderId  params: {tenderId}  ->  [{id, type, typeName, name, standards, quantity, contractPrice, description}] */
export function getProjectTypeByTenderId (params) {
  return request({
    url: '/projectType/getByTenderId',
    method: 'get',
    params,
  });
}

/** POST /api/projectType/add  data: {type, name, standards, quantity, contractPrice, description, tenderId, projectId} */
export function addProjectType (data) {
  return request({
    url: '/projectType/add',
    method: 'post',
    data,
  });
}

/** POST /api/projectType/update  data: 同 add + {id}；契约明确只收表单自身字段，不再回传整行数据 */
export function updateProjectType (data) {
  return request({
    url: '/projectType/update',
    method: 'post',
    data,
  });
}

/** POST /api/projectType/delete  data: {id} */
export function deleteProjectType (data) {
  return request({
    url: '/projectType/delete',
    method: 'post',
    data,
  });
}

/** GET /api/projectType/getPositionIconList  params: {projectId?, tenderId?, type?}  ->  项目区 -> tendersVoList -> projectTypePositionList -> roadIconList:[fileName] */
export function getPositionIconList (params) {
  return request({
    url: '/projectType/getPositionIconList',
    method: 'get',
    params,
  });
}

/**
 * POST /api/projectType/uploadPositionIcon （multipart）
 * @param {Object} payload {projectId, tenderId, proTypeId, typeName, type, files}
 *        files 为 File/Blob 数组，以同名多部件 files 提交，对应后端 MultipartFile[] files。
 * 契约 1.4 修正了 legacy 缺少前导斜杠的 'projectType/uploadPositionIcon'。
 */
export function uploadPositionIcon (payload = {}) {
  const { projectId, tenderId, proTypeId, typeName, type, files = [] } = payload;
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  // 只提交有值的字段：FormData 会把 undefined 变成字符串 "undefined"，后端按数字解析会 400
  const fields = { projectId, tenderId, proTypeId, typeName, type };
  Object.keys(fields).forEach((key) => {
    const value = fields[key];
    if (value === undefined || value === null || value === '') return;
    formData.append(key, value);
  });
  return request({
    url: '/projectType/uploadPositionIcon',
    method: 'post',
    data: formData,
  });
}
