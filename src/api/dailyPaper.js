/**
 * 2.6 日进度报告模块（只读，数据由移动端写入）
 */
import request from '@/utils/request';

/**
 * GET /api/dailypaper/getDailyPaperList
 * @param {Object} params {date, projectId, tenderId, pageNum, pageSize} —— date 格式 yyyy-MM-dd
 * -> 分页，行 {id, gmtCreate, projectName, tenderName, content}
 */
export function getDailyPaperList (params) {
  return request({
    url: '/dailypaper/getDailyPaperList',
    method: 'get',
    params,
  });
}
