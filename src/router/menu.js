/**
 * 菜单与业务路由的唯一来源：路径、中文名、图标、页面组件。
 * router/index.js 据此生成布局路由的 children，layout/Sidebar.vue 据此渲染菜单。
 * 单独成文件是为了断开 Sidebar -> router -> Layout -> Sidebar 的循环引用。
 *
 * legacy Menu 的 7 个链接里有 5 个少了前导斜杠（'NotifyManage'、'SceneVideo'、
 * 'TenderManage'、'UserManage'），还有一个大小写写错（'UploadLOcalImg'），
 * 相对路径导航静默失败。这里全部使用以 / 开头的绝对路径。
 */
export const menuRoutes = [
  {
    path: '/EngNumManage',
    name: 'EngNumManage',
    title: '工程量管理',
    icon: 'Grid',
    component: () => import('@/views/EngNumManage/index.vue'),
  },
  {
    path: '/EngRateManage',
    name: 'EngRateManage',
    title: '工程进度管理',
    icon: 'TrendCharts',
    component: () => import('@/views/EngRateManage/index.vue'),
  },
  {
    path: '/UploadLocalImg',
    name: 'UploadLocalImg',
    title: '上传定位图片',
    icon: 'Upload',
    component: () => import('@/views/UploadLocalImg/index.vue'),
  },
  {
    path: '/NotifyManage',
    name: 'NotifyManage',
    title: '通知单管理',
    icon: 'Bell',
    component: () => import('@/views/NotifyManage/index.vue'),
  },
  {
    path: '/SceneVideo',
    name: 'SceneVideo',
    title: '现场影音',
    icon: 'VideoCamera',
    component: () => import('@/views/SceneVideo/index.vue'),
  },
  {
    path: '/TenderManage',
    name: 'TenderManage',
    title: '标段资料管理',
    icon: 'Folder',
    component: () => import('@/views/TenderManage/index.vue'),
  },
  {
    path: '/UserManage',
    name: 'UserManage',
    title: '用户管理',
    icon: 'User',
    component: () => import('@/views/UserManage/index.vue'),
  },
];
