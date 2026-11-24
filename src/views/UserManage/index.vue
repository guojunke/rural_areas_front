<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="panel_header">
          <span class="panel_title">{{ route.meta.title }}</span>
          <span class="panel_hint">
            账号即手机号；超级管理员（角色 1）可不绑定项目区，其余角色必须绑定
            <template v-if="!userStore.isSuperAdmin">（当前登录账号非超管，项目区锁定为本人所属项目区）</template>
          </span>
        </div>
      </template>

      <el-form class="filter_bar" :inline="true" label-width="0" @submit.prevent="handleSearch">
        <el-form-item>
          <el-input
            v-model.trim="filters.keyword"
            placeholder="输入姓名 / 账号搜索"
            clearable
            class="filter_keyword"
            :prefix-icon="Search"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Plus" @click="openAdd">新增用户</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="70" align="center" :index="indexOf" />
        <el-table-column prop="username" label="姓名" min-width="110" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.username || '--' }}</template>
        </el-table-column>
        <el-table-column prop="mobile" label="账号" width="140" align="center">
          <template #default="{ row }">{{ row.mobile || '--' }}</template>
        </el-table-column>
        <el-table-column prop="roleName" label="角色" width="120" align="center">
          <template #default="{ row }">{{ row.roleName || roleNameOf(row.roleId) }}</template>
        </el-table-column>
        <el-table-column prop="projectName" label="项目区" min-width="140" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.projectName || '--' }}</template>
        </el-table-column>
        <!-- 契约 1.4：legacy 的 tendersName 列名统一为 tenderName -->
        <el-table-column prop="tenderName" label="标段" min-width="140" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.tenderName || '--' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="openResetPwd(row)">重置密码</el-button>
            <el-popconfirm
              title="确认删除该用户？"
              width="220"
              confirm-button-text="删除"
              cancel-button-text="取消"
              confirm-button-type="danger"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :image-size="60" description="暂无用户" />
        </template>
      </el-table>

      <el-pagination
        v-model:current-page="page.pageNum"
        v-model:page-size="page.pageSize"
        class="pager"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        @current-change="getList"
        @size-change="handleSizeChange"
      />
    </el-card>

    <!-- 新增 / 编辑：编辑不带密码字段，改密码走独立的 resetPassword -->
    <el-dialog
      v-model="formVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="520px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="姓名" prop="username">
          <el-input v-model.trim="form.username" maxlength="20" placeholder="请输入姓名" clearable />
        </el-form-item>

        <el-form-item label="账号" prop="mobile">
          <el-input
            v-model.trim="form.mobile"
            maxlength="11"
            placeholder="请输入 11 位手机号"
            clearable
          />
        </el-form-item>

        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <!-- 密码只在提交瞬间存在：不回显、不入列表、不写 storage、不打日志 -->
          <el-input
            v-model="form.password"
            type="password"
            maxlength="32"
            show-password
            autocomplete="new-password"
            placeholder="请输入初始密码"
          />
        </el-form-item>

        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" placeholder="请选择角色" class="dialog_item">
            <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="项目区" prop="projectId">
          <el-select
            v-model="form.projectId"
            :placeholder="projectRequired ? '请选择项目区' : '可不选（仅超管）'"
            clearable
            :disabled="projectLocked"
            class="dialog_item"
            @change="handleProjectChange"
          >
            <el-option
              v-for="item in projectList"
              :key="item.id"
              :label="item.projectName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标段" prop="tenderId">
          <el-select
            v-model="form.tenderId"
            placeholder="全部标段"
            clearable
            :loading="tenderLoading"
            class="dialog_item"
          >
            <el-option
              v-for="item in tenderList"
              :key="item.id"
              :label="item.tenderName || '--'"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pwdVisible" title="重置密码" width="460px" @closed="resetPwdForm">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px">
        <el-form-item label="用户">
          <span>{{ pwdForm.username }}（{{ pwdForm.mobile }}）</span>
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="pwdForm.password"
            type="password"
            maxlength="32"
            show-password
            autocomplete="new-password"
            placeholder="请输入新密码"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input
            v-model="pwdForm.confirm"
            type="password"
            maxlength="32"
            show-password
            autocomplete="new-password"
            placeholder="请再次输入新密码"
            @keyup.enter="handleResetPwd"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleResetPwd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Plus, RefreshLeft, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import {
  createUser,
  deleteUser,
  getPages,
  getRole,
  resetPassword,
  updateUser,
} from '@/api/user';
import { getProjectList } from '@/api/project';
import { getTendersList } from '@/api/tender';
import { useUserStore } from '@/store/user';

const MOBILE_REGEX = /^\d{11}$/;

const route = useRoute();
const userStore = useUserStore();

const loading = ref(false);
const submitting = ref(false);
const tenderLoading = ref(false);
const tableData = ref([]);
const total = ref(0);
const roleMap = ref({});
const projectList = ref([]);
const tenderList = ref([]);
const formVisible = ref(false);
const isEdit = ref(false);
const pwdVisible = ref(false);
const formRef = ref();
const pwdFormRef = ref();

const filters = reactive({
  keyword: '',
});
const page = reactive({
  pageNum: 1,
  pageSize: 20,
});
const form = reactive({
  id: null,
  username: '',
  mobile: '',
  password: '',
  roleId: '',
  projectId: '',
  tenderId: '',
});
const pwdForm = reactive({
  id: null,
  username: '',
  mobile: '',
  password: '',
  confirm: '',
});

/** POST /api/user/getRole 返回的是 code -> 名称 的映射，不是数组（契约 2.1） */
const roleOptions = computed(() => {
  const entries = Object.entries(roleMap.value || {});
  const options = entries.map(([code, label]) => ({ value: Number(code), label }));
  // 非超管不允许授予/编辑出超管账号
  return userStore.isSuperAdmin ? options : options.filter((item) => item.value !== 1);
});

/** 契约 2.1 / legacy 校验：角色 1 允许不绑定项目区，其余必填 */
const projectRequired = computed(() => Number(form.roleId) !== 1);
/** 数据范围（契约 4）：非超管只能把用户挂到自己所在的项目区 */
const projectLocked = computed(
  () => !userStore.isSuperAdmin && Boolean(userStore.userInfo && userStore.userInfo.projectId)
);

const formRules = computed(() => ({
  username: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  mobile: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { pattern: MOBILE_REGEX, message: '账号须为 11 位数字手机号', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为 6-32 位', trigger: 'blur' },
  ],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
  projectId: projectRequired.value
    ? [{ required: true, message: '非超级管理员必须选择项目区', trigger: 'change' }]
    : [],
}));

const pwdRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为 6-32 位', trigger: 'blur' },
  ],
  confirm: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== pwdForm.password) {
          callback(new Error('两次输入的密码不一致'));
          return;
        }
        callback();
      },
      trigger: 'blur',
    },
  ],
};

function indexOf (index) {
  return (page.pageNum - 1) * page.pageSize + index + 1;
}

function roleNameOf (roleId) {
  if (roleId === undefined || roleId === null || roleId === '') return '--';
  return (roleMap.value || {})[String(roleId)] || '--';
}

async function getRoleMap () {
  try {
    const res = await getRole();
    roleMap.value = (res && res.data) || {};
  } catch (e) {
    roleMap.value = {};
  }
}

async function getProjectListData () {
  try {
    const res = await getProjectList();
    projectList.value = (res && res.data) || [];
  } catch (e) {
    projectList.value = [];
  }
}

async function fetchTenderList () {
  tenderLoading.value = true;
  try {
    const res = await getTendersList({ projectId: form.projectId });
    tenderList.value = (res && res.data) || [];
  } catch (e) {
    tenderList.value = [];
  } finally {
    tenderLoading.value = false;
  }
}

function handleProjectChange () {
  form.tenderId = '';
  fetchTenderList();
}

async function getList () {
  loading.value = true;
  try {
    const res = await getPages({
      keyword: filters.keyword,
      pageNum: page.pageNum,
      pageSize: page.pageSize,
    });
    const data = (res && res.data) || {};
    tableData.value = data.dataList || [];
    total.value = data.total || 0;
  } catch (e) {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch () {
  page.pageNum = 1;
  getList();
}

function handleSizeChange () {
  page.pageNum = 1;
  getList();
}

function handleReset () {
  filters.keyword = '';
  page.pageNum = 1;
  getList();
}

function resetForm () {
  form.id = null;
  form.username = '';
  form.mobile = '';
  form.password = '';
  form.roleId = '';
  form.projectId = '';
  form.tenderId = '';
  tenderList.value = [];
  formRef.value && formRef.value.clearValidate();
}

function applyProjectLock () {
  if (projectLocked.value) {
    form.projectId = Number(userStore.userInfo.projectId);
  }
}

function openAdd () {
  resetForm();
  isEdit.value = false;
  applyProjectLock();
  if (form.projectId) fetchTenderList();
  formVisible.value = true;
}

function openEdit (row) {
  resetForm();
  isEdit.value = true;
  form.id = row.id;
  form.username = row.username || '';
  form.mobile = row.mobile || '';
  form.roleId = row.roleId === undefined || row.roleId === null ? '' : Number(row.roleId);
  form.projectId = row.projectId === undefined || row.projectId === null ? '' : Number(row.projectId);
  form.tenderId = row.tenderId === undefined || row.tenderId === null ? '' : Number(row.tenderId);
  applyProjectLock();
  fetchTenderList();
  formVisible.value = true;
}

async function handleSubmit () {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (isEdit.value) {
      await updateUser({
        id: form.id,
        username: form.username,
        mobile: form.mobile,
        roleId: form.roleId,
        projectId: form.projectId,
        tenderId: form.tenderId,
      });
      ElMessage.success('修改成功');
    } else {
      await createUser({
        username: form.username,
        mobile: form.mobile,
        password: form.password,
        roleId: form.roleId,
        projectId: form.projectId,
        tenderId: form.tenderId,
      });
      ElMessage.success('添加成功');
    }
    formVisible.value = false;
    getList();
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}

function openResetPwd (row) {
  pwdForm.id = row.id;
  pwdForm.username = row.username || '';
  pwdForm.mobile = row.mobile || '';
  pwdForm.password = '';
  pwdForm.confirm = '';
  pwdVisible.value = true;
}

function resetPwdForm () {
  // 关闭即清空，密码不残留在组件状态里
  pwdForm.id = null;
  pwdForm.username = '';
  pwdForm.mobile = '';
  pwdForm.password = '';
  pwdForm.confirm = '';
  pwdFormRef.value && pwdFormRef.value.clearValidate();
}

async function handleResetPwd () {
  const valid = await pwdFormRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await resetPassword({ id: pwdForm.id, password: pwdForm.password });
    ElMessage.success('密码已重置');
    pwdVisible.value = false;
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}

async function handleDelete (row) {
  try {
    await deleteUser({ id: row.id });
    ElMessage.success('删除成功');
    if (tableData.value.length === 1 && page.pageNum > 1) page.pageNum -= 1;
    getList();
  } catch (e) {
    // 拦截器已提示
  }
}

onMounted(() => {
  getRoleMap();
  getProjectListData();
  getList();
});
</script>

<style lang="scss" scoped>
.panel_header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.panel_title {
  font-size: 16px;
  font-weight: 600;
}

.panel_hint {
  font-size: 12px;
  color: #909399;
}

.filter_bar {
  margin-bottom: 4px;
}

.filter_keyword {
  width: 260px;
}

.dialog_item {
  width: 220px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
