/**
 * 文件下载（契约 2.7 最后一条）
 * /file/download 是唯一没有 /api 前缀的接口，所以不能用 request.js 的 baseURL，
 * 这里显式覆盖。legacy 把地址硬编码成 http://<ip>:9001/notice/downloadFile?fileName=，
 * 本系统统一为 /file/download，前缀由 VITE_API_BASE 推导，代码里不出现服务器地址。
 */
import request from '@/utils/request';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/** 计算 /file 的前缀：相对路径时保持相对（同源转发）；绝对路径时取同一 origin */
function filePrefix () {
  if (/^https?:\/\//i.test(API_BASE)) {
    return `${new URL(API_BASE).origin}/file`;
  }
  return '/file';
}

/**
 * 用于 <img> / <el-image> / <a download> 的直接地址。
 * @param {string} fileName 后端返回的文件名（列表接口的 fileNameList 元素）
 */
export function getFileUrl (fileName) {
  if (!fileName) return '';
  return `${filePrefix()}/download?fileName=${encodeURIComponent(fileName)}`;
}

/**
 * 需要拿 Blob（另存为、预览、批量打包）时使用。
 * @returns {Promise<Blob>} 二进制流不做信封判断，拦截器直接返回 Blob
 */
export function downloadFile (fileName, config = {}) {
  return request({
    url: '/download',
    method: 'get',
    baseURL: filePrefix(),
    params: { fileName },
    responseType: 'blob',
    ...config,
  });
}
