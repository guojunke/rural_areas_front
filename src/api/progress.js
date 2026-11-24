/**
 * 2.5 工程进度模块
 * 契约把 legacy 硬编码在前端的 9 类工程进度项移到服务端（getProcessItems），
 * 提交体也统一为固定的 items 数组，前端按字典动态渲染，不再拼 {wellProcess:{...}} 这种动态 key。
 */
import request from '@/utils/request';

/**
 * GET /api/progress/getTenderProgressList
 * @param {Object} params {projectId, tenderId, type} —— 契约 4：projectId 必传（legacy 默认取 1 的行为不保留）
 */
export function getTenderProgressList (params) {
  return request({
    url: '/progress/getTenderProgressList',
    method: 'get',
    params,
  });
}

/** POST /api/progress/update  data: {proTypeId, items:[{key, dayNum, totalNum}]}；dayNum=昨日进度，totalNum=累计进度 */
export function updateProgress (data) {
  return request({
    url: '/progress/update',
    method: 'post',
    data,
  });
}

/** GET /api/progress/getProcessItems  params: {type}  ->  {processName, items:[{key, label, unit}]} */
export function getProcessItems (params) {
  return request({
    url: '/progress/getProcessItems',
    method: 'get',
    params,
  });
}
