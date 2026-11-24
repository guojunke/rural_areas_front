/**
 * 用户状态：token + userInfo，持久化到 sessionStorage。
 * 契约 1.3：登录接口签发 JWT，之后每个请求都要带 token 头（见 utils/request.js）。
 * 契约 2.1：角色 1 为超级管理员，允许不绑定项目区。
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { login as loginApi } from '@/api/user';
import { TOKEN_KEY } from '@/utils/request';

const USER_INFO_KEY = 'userInfo';

function readStoredUserInfo () {
  const raw = window.sessionStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    window.sessionStorage.removeItem(USER_INFO_KEY);
    return null;
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref(window.sessionStorage.getItem(TOKEN_KEY) || '');
  const userInfo = ref(readStoredUserInfo());

  // 后端 roleId 可能是数字也可能是字符串，统一转数字再比较
  const isSuperAdmin = computed(() => Number(userInfo.value && userInfo.value.roleId) === 1);
  const username = computed(() => (userInfo.value && userInfo.value.username) || '');

  function setToken (value) {
    token.value = value || '';
    if (token.value) {
      window.sessionStorage.setItem(TOKEN_KEY, token.value);
    } else {
      window.sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  function setUserInfo (value) {
    userInfo.value = value || null;
    if (userInfo.value) {
      window.sessionStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo.value));
    } else {
      window.sessionStorage.removeItem(USER_INFO_KEY);
    }
  }

  /**
   * @param {{mobile: string, password: string}} params
   * @returns {Promise<Object>} 登录接口返回的 data（已剔除 token）
   */
  async function login (params) {
    // 响应拦截器已保证只有 errorCode === '0' 才会 resolve
    const res = await loginApi(params);
    const data = (res && res.data) || {};
    const { token: jwt, ...profile } = data;
    setToken(jwt);
    setUserInfo(profile);
    return profile;
  }

  /**
   * 退出登录：只清认证相关的 key。
   * 跳转登录页由调用方（Navbar）负责，避免 store 依赖 router。
   */
  function logout () {
    setToken('');
    setUserInfo(null);
    window.sessionStorage.clear();
  }

  return {
    token,
    userInfo,
    isSuperAdmin,
    username,
    setToken,
    setUserInfo,
    login,
    logout,
  };
});
