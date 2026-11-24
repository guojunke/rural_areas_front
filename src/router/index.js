/**
 * 路由表：
 * - '/' 重定向 '/login'
 * - '/login' 免鉴权
 * - 业务页面挂在布局壳（layout）下，路径与中文标题与 legacy 完全一致，
 *   模块页面（其他同事实现）可直接落位到 src/views/<Name>/index.vue。
 */
import { createRouter, createWebHistory } from 'vue-router';
import Layout from '@/layout/index.vue';
import { useUserStore } from '@/store/user';
import { menuRoutes } from '@/router/menu';

const layoutRoute = {
  // 布局壳自身没有业务 URL：'/' 已经用于跳转登录页，所以给一个不会被直接访问的路径。
  // children 用绝对路径声明（vue-router 中以 / 开头的子路径按根路径匹配），
  // 因此最终 URL 仍是 /EngNumManage 这样的 legacy 路径。
  path: '/layout',
  component: Layout,
  children: menuRoutes.map((item) => ({
    path: item.path,
    name: item.name,
    component: item.component,
    meta: { title: item.title, icon: item.icon },
  })),
};

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' },
  },
  layoutRoute,
  {
    // 兜底：未登录时会被守卫拦到登录页，已登录则回到默认业务页
    path: '/:pathMatch(.*)*',
    redirect: '/EngNumManage',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta && to.meta.title) {
    window.document.title = to.meta.title;
  }
  // main.js 中 pinia 先于 router 安装，守卫里可以安全使用 store
  const userStore = useUserStore();
  if (to.path === '/login') return true; // 登录页允许未鉴权访问
  if (!userStore.token) return { path: '/login' };
  return true;
});

export default router;
