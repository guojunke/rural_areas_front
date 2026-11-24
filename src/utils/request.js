/**
 * axios 实例：实现接口契约的响应信封与 token 鉴权。
 * 参考 docs/api-contract.md 第 1.2 / 1.3 节。
 *
 * 与 legacy pc 的差异（契约 1.3 明确要求修掉的两个坑）：
 * 1. 旧代码读 sessionStorage.getItem('token')，但登录流程从未写入过 token，
 *    且请求拦截器把 withCredentials 强制改成 false —— 等于永远不带凭证。
 *    这里 token 由 POST /api/user/login 签发并写入 sessionStorage，每个请求都带上。
 * 2. 旧代码只在 get/post 包装函数里判断 errorCode，拦截层没有统一处理。
 *    这里统一在响应拦截器判断，调用方拿到的就是完整信封。
 */
import axios from 'axios';
import { ElMessage } from 'element-plus';

/** token 在 sessionStorage 中的 key，store/user.js 与路由守卫共用 */
export const TOKEN_KEY = 'token';

const ERROR_CODE_SUCCESS = '0';
const ERROR_CODE_UNAUTHORIZED = '401';

const service = axios.create({
  // 开发环境为相对路径 /api，命中 vite 代理；生产环境同域，由网关按前缀转发
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 20000,
  // 这里故意不设默认 Content-Type：
  // axios 1.x 在已有 application/json 头时会把 FormData 直接 JSON.stringify 掉（实测），
  // 契约 2.4/2.8/2.9 的 multipart 上传就会变成空 body。
  // 交给 axios 自己判断：普通对象 -> application/json；FormData -> 浏览器补 boundary。
});

/** GET 查询参数里空的筛选项会拼成 ?date=&projectId= ，后端按 yyyy-MM-dd 解析会直接 400 */
function dropEmptyParams (params) {
  if (!params || typeof params !== 'object') return params;
  const result = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    result[key] = value;
  });
  return result;
}

/**
 * errorCode 为 '401'：票据过期或非法。清 sessionStorage、跳登录页。
 * 用动态 import 拿 router，避免 request.js -> router -> store -> api -> request.js 的静态循环依赖。
 */
let redirecting = false;
async function handleUnauthorized (message) {
  window.sessionStorage.clear();
  ElMessage.error(message || '登录状态已失效，请重新登录');
  if (redirecting || window.location.pathname === '/login') return;
  redirecting = true;
  try {
    const { default: router } = await import('@/router');
    await router.replace('/login');
  } catch (e) {
    window.location.href = '/login';
  } finally {
    redirecting = false;
  }
}

service.interceptors.request.use(
  (config) => {
    const token = window.sessionStorage.getItem(TOKEN_KEY) || '';
    // 契约 1.3：统一用 token 头（后端同时接受 Authorization: Bearer）
    if (token) config.headers.token = token;
    if (config.method === 'get') config.params = dropEmptyParams(config.params);
    return config;
  },
  (error) => Promise.reject(error)
);

service.interceptors.response.use(
  async (response) => {
    let payload = response.data;

    // /file/download 这类二进制流：没有信封。
    // 但后端出错时会把信封塞进 Blob，所以只在 content-type 是 JSON 时按信封处理。
    if (response.config.responseType === 'blob') {
      const isJsonEnvelope = payload instanceof Blob && (payload.type || '').includes('application/json');
      if (!isJsonEnvelope) return payload;
      try {
        payload = JSON.parse(await payload.text());
      } catch (e) {
        return response.data;
      }
    }

    // 严格字符串比较：后端返回的 errorCode 是字符串（契约 1.2）
    if (payload && typeof payload === 'object' && payload.errorCode === ERROR_CODE_SUCCESS) {
      return payload;
    }

    const message = (payload && payload.message) || '';
    if (payload && payload.errorCode === ERROR_CODE_UNAUTHORIZED) {
      await handleUnauthorized(message);
    } else {
      ElMessage.error(message || '请求失败');
    }
    return Promise.reject(payload || { message });
  },
  (error) => {
    const status = error.response && error.response.status;
    // 契约里鉴权失败走 errorCode:'401'，HTTP 401 属于后端兜底行为，这里同样按失效处理
    if (status === 401) {
      handleUnauthorized();
      return Promise.reject(error);
    }
    let message = '网络异常，请检查后端服务是否可用';
    if (error.code === 'ECONNABORTED' || (error.message || '').includes('timeout')) {
      message = '请求超时，请稍后重试';
    } else if (status === 404) {
      message = `请求地址 ${error.config && error.config.url} 不存在`;
    } else if (status) {
      message = `请求失败（HTTP ${status}）`;
    }
    ElMessage.error(message);
    return Promise.reject(error);
  }
);

export default service;
