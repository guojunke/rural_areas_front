# rural_areas_front

智慧高标管理系统前端。由 legacy Vue 2 + iView 版本（`../pc`）重建为 **Vue 3 + Vite 5 + Element Plus + Pinia**。

业务是农村建设项目管理，数据层级为 **项目区 → 标段 → 工程量**，另有工程进度上报、通知单、现场影音、标段资料与用户管理。

> 接口契约（唯一权威依据）：[`../rural_areas/docs/api-contract.md`](../rural_areas/docs/api-contract.md)
> 后端仓库：`../rural_areas`（Spring Boot，与本仓库并行开发，双方只以该文档对齐）

当前仓库是**骨架**：登录页 + 布局壳 + 请求层 + 路由 + 接口封装已完成并可构建运行；7 个业务页面已实现并可构建运行。

## 快速开始

```bash
npm install        # 依赖来自 registry.npmjs.org；网络不通时改用 npm install --registry=https://registry.npmmirror.com
npm run dev        # http://127.0.0.1:5173
npm run build      # 产出 dist/
npm run preview    # 预览构建产物
```

Node 18+（开发机实测 v20.13.1）。样式用 dart-sass（`sass`），**不是** legacy 的 node-sass（后者在新 Node 上无法编译）。

## 环境变量与开发代理

| 变量 | 位置 | 作用 |
| --- | --- | --- |
| `VITE_API_BASE` | `.env.development` / `.env.production` | axios `baseURL`，两端都是相对路径 `/api` |
| `VITE_PROXY_TARGET` | `.env.development` | 仅开发代理使用的后端地址，默认 `http://127.0.0.1:8080` |

开发时 `VITE_API_BASE=/api` 命中 Vite 代理，转发到 `VITE_PROXY_TARGET`；生产同样用相对路径，由同域或网关按前缀转发。**业务代码里不出现任何服务器 IP**（legacy 在 `main.js` 和 `.env` 里硬编码了 `http://47.92.72.52:9001`）。

代理同时挂 `/api` 与 `/file` 两条规则：契约 1.1 规定所有接口带 `/api` 前缀，但 2.7 的文件下载 `GET /file/download` 是唯一例外，只代理 `/api` 会让下载 404 并回退到 SPA 的 `index.html`。两条规则都不做 `pathRewrite`，后端保持契约路径原样。

本机联调改 `VITE_PROXY_TARGET`，或新建 `.env.development.local` 覆盖（该文件已被 `.gitignore` 忽略）。

## 目录结构

```
src/
├── api/                 # 契约 2.x 每个模块一个文件，薄封装，路径与方法严格照抄契约
│   ├── user.js  project.js  tender.js  projectType.js  progress.js
│   ├── dailyPaper.js  notice.js  video.js  tenderData.js  file.js
├── layout/              # index.vue（壳）+ Sidebar.vue（菜单）+ Navbar.vue（标题栏）
├── router/
│   ├── menu.js          # 菜单 + 业务路由的唯一来源（path / 中文标题 / 图标 / 组件）
│   └── index.js         # 路由表与 beforeEach 守卫
├── store/user.js        # pinia：token、userInfo、isSuperAdmin、login/logout，持久化 sessionStorage
├── styles/index.scss    # 全局样式与布局尺寸变量
├── utils/request.js     # axios 实例：token 注入 + 响应信封处理
└── views/
    ├── login/index.vue  # 已实现
    └── EngNumManage|EngRateManage|UploadLocalImg|NotifyManage|SceneVideo|TenderManage|UserManage/index.vue  # 已实现
```

## 请求层约定（`src/utils/request.js`）

契约 1.2 的信封是 `{errorCode, message, success, data}`，`errorCode` 是**字符串**，成功判断保持严格 `=== '0'`。

- 请求拦截器：从 `sessionStorage` 取 token 并写入 `token` 请求头（契约 1.3，后端也接受 `Authorization: Bearer`）；GET 参数中 `undefined` / `null` / `''` 会被剔除，避免筛选项拼出 `?date=&projectId=` 让后端按 `yyyy-MM-dd` 解析时 400。
- 响应拦截器：
  - `errorCode === '0'` → resolve **完整响应体**，调用方自己读 `res.data` / `res.success` / `res.message`；
  - `errorCode === '401'` → 清空 `sessionStorage`、提示后跳 `/login`，并 reject；
  - 其他 `errorCode` → `ElMessage.error(message)` 后 reject（reject 出的就是信封对象，登录页据此显示服务端 `message`）；
  - `responseType: 'blob'`（`/file/download`）不做信封判断，直接返回 Blob；若后端把错误信封塞在 Blob 里（`type` 为 JSON）则解析后按信封处理；
  - 网络/HTTP 错误统一 `ElMessage` 提示（超时、404、其他状态码、后端不可达分别给文案）。

文件地址一律用 `@/api/file.js` 的 `getFileUrl(fileName)`（给 `<img>` / `<a>`）或 `downloadFile(fileName)`（拿 Blob），对应 `GET /file/download?fileName=`。

## 与 legacy（`../pc`）的刻意差异

1. **真正鉴权**：legacy 的 `axios.js` 读 `sessionStorage.getItem('token')`，但登录流程从未写入过 token，且请求拦截器把 `withCredentials` 强制改成 `false`，等于所有请求都不带凭证。现在登录签发 JWT 存入 `sessionStorage`，每个请求带 `token` 头。
2. **不在客户端存密码**：legacy 登录页把明文密码写进 `localStorage` 做「记住密码」，而且 `created()` 里把 `getItem` 误写成 `setItem`，自动填充从未生效。该功能直接下线，不做不安全的重现。
3. **正确的绝对路由**：legacy Menu 的 7 个链接有 5 个缺前导斜杠、1 个大小写写错（`UploadLOcalImg`），相对路径导航静默失败。菜单项由 `src/router/menu.js` 统一生成，路径全部以 `/` 开头。
4. **菜单高亮由路由驱动**：legacy 用 `$store.state.currentRouterName` 匹配菜单标题字符串，改一个字就丢高亮；现在 `el-menu` 的 `default-active` 绑定 `route.path`。
5. **字段命名按契约 1.4**：`projectId` / `tenderId` / `title` / `tenderList` / `description`，`/api/user/getPages`（无尾随空格）、`/api/projectType/uploadPositionIcon`（带前导斜杠）、`/api/tenderData/*`（不是 `tendersData`）、`/api/projectType/getByTenderId`（不是 `getProTypeByTendersId`）；不保留旧名兼容。
6. **进度项字典移到服务端**：legacy 把 9 类工程的进度项硬编码在前端并用 `{wellProcess:{...}}` 动态 key 提交；现在按 `getProcessItems` 返回的字典动态渲染，提交体是固定的 `items` 数组。
7. 其他：`publicPath` 从 `/wisdom` 改为根路径；Vuex 换 Pinia；`node-sass` 换 `sass`；未配置 eslint（骨架阶段宁可不给 `lint` 脚本，也不留一个跑不通的脚本）。

## 模块页面

- `EngNumManage`：项目区、标段、工程量的树形管理与增删改查。
- `EngRateManage`：日进度报告查询、详情和按服务端字典填报进度。
- `UploadLocalImg`：按项目区、标段、工程量查询和上传定位图片。
- `NotifyManage`：通知单筛选、附件预览与删除。
- `SceneVideo`：现场影音上传、预览与删除。
- `TenderManage`：标段资料上传、预览与删除。
- `UserManage`：用户、角色、项目范围和密码管理。

页面接口只从 `@/api/*` 引入。超管判断使用 `useUserStore().isSuperAdmin`，数据范围由后端校验；前端筛选不能替代后端权限控制。
