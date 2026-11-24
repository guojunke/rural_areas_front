<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="panel_header">
          <span class="panel_title">{{ route.meta.title }}</span>
          <span class="panel_hint">资料挂在 项目区 → 标段 下，接口为契约 2.9 的 /api/tenderData/*</span>
        </div>
      </template>

      <el-form class="filter_bar" :inline="true" label-width="0" @submit.prevent="handleSearch">
        <el-form-item label="发布时间">
          <el-date-picker
            v-model="filters.date"
            type="date"
            placeholder="请选择日期"
            value-format="YYYY-MM-DD"
            clearable
            class="filter_date"
          />
        </el-form-item>

        <el-form-item label="项目区">
          <el-select
            v-model="filters.projectId"
            placeholder="全部项目区"
            clearable
            class="filter_item"
            @change="handleFilterProjectChange"
          >
            <el-option
              v-for="item in projectList"
              :key="item.id"
              :label="item.projectName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标段">
          <el-select
            v-model="filters.tenderId"
            placeholder="全部标段"
            clearable
            class="filter_item"
            :loading="filterTenderLoading"
          >
            <el-option
              v-for="item in filterTenderList"
              :key="item.id"
              :label="item.tenderName || '--'"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="类型">
          <!-- "全部"取空串：request.js 剔除空 GET 参数，不会发出 type= -->
          <el-select v-model="filters.type" class="filter_item">
            <el-option v-for="item in typeOptions" :key="item" :label="item" :value="optionValue(item)" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
          <el-button type="success" :icon="Plus" @click="openAdd">新增</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column type="index" label="序号" width="70" align="center" :index="indexOf" />
        <el-table-column prop="gmtCreate" label="发布时间" width="180" align="center">
          <template #default="{ row }">{{ row.gmtCreate || '--' }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="150" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.title || '--' }}</template>
        </el-table-column>
        <el-table-column prop="projectName" label="项目区" min-width="130" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.projectName || '--' }}</template>
        </el-table-column>
        <el-table-column prop="tenderName" label="标段" min-width="130" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.tenderName || '--' }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="110" align="center">
          <template #default="{ row }">{{ row.type || '--' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="描述" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.remark || '--' }}</template>
        </el-table-column>
        <el-table-column label="附件" width="80" align="center">
          <template #default="{ row }">{{ (row.fileNameList || []).length }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看</el-button>
            <el-popconfirm
              title="确认删除该资料？"
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
          <el-empty :image-size="60" description="暂无标段资料" />
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

    <!-- 新增：项目区 + 标段 + 标题 + 类型 + 描述 + files（同名多部件，契约 2.9） -->
    <el-dialog v-model="addVisible" title="新增标段资料" width="520px" @closed="resetForm">
      <el-form ref="addFormRef" :model="addForm" :rules="addRules" label-width="80px">
        <el-form-item label="项目区" prop="projectId">
          <el-select
            v-model="addForm.projectId"
            placeholder="请选择项目区"
            class="dialog_item"
            @change="handleAddProjectChange"
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
            v-model="addForm.tenderId"
            placeholder="请选择标段"
            class="dialog_item"
            :loading="addTenderLoading"
            :no-data-text="addForm.projectId ? '该项目区下暂无标段' : '请先选择项目区'"
          >
            <el-option
              v-for="item in addTenderList"
              :key="item.id"
              :label="item.tenderName || '--'"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标题" prop="title">
          <el-input v-model.trim="addForm.title" maxlength="50" placeholder="请输入标题" clearable />
        </el-form-item>

        <el-form-item label="类型" prop="type">
          <el-select v-model="addForm.type" placeholder="请选择类型" class="dialog_item">
            <el-option v-for="item in DATA_TYPES" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item label="描述" prop="remark">
          <el-input
            v-model="addForm.remark"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入描述"
          />
        </el-form-item>

        <el-form-item label="附件" prop="fileList">
          <el-upload
            v-model:file-list="addForm.fileList"
            multiple
            :auto-upload="false"
            action="#"
          >
            <el-button :icon="UploadFilled">选择文件</el-button>
            <template #tip>
              <div class="upload_tip">支持多个文件，提交时以同名多部件 files 上传</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" :title="detail && detail.title" width="560px">
      <el-descriptions v-if="detail" :column="1" border size="small">
        <el-descriptions-item label="项目区">{{ detail.projectName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="标段">{{ detail.tenderName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="发布时间">{{ detail.gmtCreate || '--' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.type || '--' }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ detail.remark || '--' }}</el-descriptions-item>
        <el-descriptions-item label="附件">
          <div v-if="detailFiles.length" class="attachment_list">
            <a
              v-for="name in detailFiles"
              :key="name"
              class="attachment_link"
              :href="getFileUrl(name)"
              :download="name"
            >
              {{ name }}
            </a>
          </div>
          <span v-else class="attachment_empty">无附件</span>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="detail" class="attachment_media">
        <template v-for="name in detailFiles" :key="`media-${name}`">
          <el-image
            v-if="kindOf(name) === 'image'"
            class="media_thumb"
            fit="cover"
            :src="getFileUrl(name)"
            :preview-src-list="imagePreviewList"
            :initial-index="imagePreviewList.indexOf(name)"
            preview-teleported
          />
          <video
            v-else-if="kindOf(name) === 'video'"
            class="media_video"
            controls
            preload="metadata"
            :src="getFileUrl(name)"
          />
        </template>
      </div>

      <template #footer>
        <el-button type="primary" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Plus, RefreshLeft, Search, UploadFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { addTenderData, deleteTenderData, listTenderData } from '@/api/tenderData';
import { getProjectList } from '@/api/project';
import { getTendersList } from '@/api/tender';
import { getFileUrl } from '@/api/file';

const ALL_LABEL = '全部';
/** 契约 2.9：资料类型固定五项 */
const DATA_TYPES = ['开工资料', '过程资料', '竣工资料', '付款资料', '验收资料'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const VIDEO_EXT = ['mp4', 'webm', 'ogg', 'mov', 'm4v'];

const route = useRoute();

const loading = ref(false);
const submitting = ref(false);
const filterTenderLoading = ref(false);
const addTenderLoading = ref(false);
const tableData = ref([]);
const total = ref(0);
const projectList = ref([]);
const filterTenderList = ref([]);
const addTenderList = ref([]);
const addVisible = ref(false);
const detailVisible = ref(false);
const detail = ref(null);
const addFormRef = ref();

const filters = reactive({
  date: '',
  projectId: '',
  tenderId: '',
  type: '',
});
const page = reactive({
  pageNum: 1,
  pageSize: 20,
});
const addForm = reactive({
  projectId: '',
  tenderId: '',
  title: '',
  type: '',
  remark: '',
  fileList: [],
});

const typeOptions = computed(() => [ALL_LABEL, ...DATA_TYPES]);
const detailFiles = computed(() => (detail.value && detail.value.fileNameList) || []);
const imagePreviewList = computed(() => detailFiles.value.filter((name) => kindOf(name) === 'image'));

const addRules = {
  projectId: [{ required: true, message: '请选择项目区', trigger: 'change' }],
  tenderId: [{ required: true, message: '请选择标段', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  remark: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  fileList: [
    {
      required: true,
      validator: (rule, value, callback) => {
        if (!value || !value.length) {
          callback(new Error('请至少选择一个附件'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
};

function optionValue (label) {
  return label === ALL_LABEL ? '' : label;
}

function extOf (fileName) {
  const idx = (fileName || '').lastIndexOf('.');
  return idx === -1 ? '' : fileName.slice(idx + 1).toLowerCase();
}

function kindOf (fileName) {
  const ext = extOf(fileName);
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (VIDEO_EXT.includes(ext)) return 'video';
  return 'file';
}

function indexOf (index) {
  return (page.pageNum - 1) * page.pageSize + index + 1;
}

async function getProjectListData () {
  try {
    const res = await getProjectList();
    projectList.value = (res && res.data) || [];
  } catch (e) {
    projectList.value = [];
  }
}

/** 级联取标段：projectId 为空时参数被 request.js 丢掉，等价于查全部标段 */
async function fetchFilterTenders () {
  filterTenderLoading.value = true;
  try {
    const res = await getTendersList({ projectId: filters.projectId });
    filterTenderList.value = (res && res.data) || [];
  } catch (e) {
    filterTenderList.value = [];
  } finally {
    filterTenderLoading.value = false;
  }
}

async function fetchAddTenders () {
  addTenderLoading.value = true;
  try {
    const res = await getTendersList({ projectId: addForm.projectId });
    addTenderList.value = (res && res.data) || [];
  } catch (e) {
    addTenderList.value = [];
  } finally {
    addTenderLoading.value = false;
  }
}

function handleFilterProjectChange () {
  filters.tenderId = '';
  fetchFilterTenders();
}

function handleAddProjectChange () {
  addForm.tenderId = '';
  fetchAddTenders();
}

async function getList () {
  loading.value = true;
  try {
    const res = await listTenderData({
      pageNum: page.pageNum,
      pageSize: page.pageSize,
      date: filters.date,
      projectId: filters.projectId,
      tenderId: filters.tenderId,
      type: filters.type,
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
  filters.date = '';
  filters.projectId = '';
  filters.tenderId = '';
  filters.type = '';
  page.pageNum = 1;
  fetchFilterTenders();
  getList();
}

function openAdd () {
  resetForm();
  fetchAddTenders();
  addVisible.value = true;
}

function resetForm () {
  addForm.projectId = '';
  addForm.tenderId = '';
  addForm.title = '';
  addForm.type = '';
  addForm.remark = '';
  addForm.fileList = [];
  addTenderList.value = [];
  addFormRef.value && addFormRef.value.clearValidate();
}

async function handleAdd () {
  const valid = await addFormRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const files = addForm.fileList.map((item) => item.raw).filter(Boolean);
    await addTenderData({
      title: addForm.title,
      projectId: addForm.projectId,
      tenderId: addForm.tenderId,
      type: addForm.type,
      remark: addForm.remark,
      files,
    });
    ElMessage.success('添加成功');
    addVisible.value = false;
    page.pageNum = 1;
    getList();
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}

function openDetail (row) {
  detail.value = row;
  detailVisible.value = true;
}

async function handleDelete (row) {
  try {
    await deleteTenderData({ id: row.id });
    ElMessage.success('删除成功');
    if (tableData.value.length === 1 && page.pageNum > 1) page.pageNum -= 1;
    getList();
  } catch (e) {
    // 拦截器已提示
  }
}

onMounted(() => {
  getProjectListData();
  fetchFilterTenders();
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

.filter_item {
  width: 180px;
}

.filter_date {
  width: 200px;
}

.dialog_item {
  width: 220px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.upload_tip {
  font-size: 12px;
  color: #909399;
}

.attachment_list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.attachment_link {
  word-break: break-all;
}

.attachment_empty {
  color: #909399;
}

.attachment_media {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.media_thumb {
  width: 96px;
  height: 96px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.media_video {
  width: 220px;
  max-height: 140px;
  background: #000;
  border-radius: 4px;
}
</style>
