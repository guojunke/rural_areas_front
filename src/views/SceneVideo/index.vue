<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="panel_header">
          <span class="panel_title">{{ route.meta.title }}</span>
          <span class="panel_hint">现场影音为全局数据，不挂项目区（契约 2.8 / 数据模型第 3 节）</span>
        </div>
      </template>

      <el-form class="filter_bar" :inline="true" label-width="0" @submit.prevent="handleSearch">
        <el-form-item label="发布时间">
          <!-- value-format 保证 v-model 直接是 yyyy-MM-dd，正是契约的 date 入参格式 -->
          <el-date-picker
            v-model="filters.date"
            type="date"
            placeholder="请选择日期"
            value-format="YYYY-MM-DD"
            clearable
            class="filter_date"
          />
        </el-form-item>

        <el-form-item label="类型">
          <!-- "全部"= 空串，request.js 会剔除空参数，不会发出 type= -->
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
        <el-table-column prop="title" label="标题" min-width="160" align="center" show-overflow-tooltip>
          <!-- 契约 1.4：legacy 的 tiltle 拼写已修正为 title，列表也不再回退到旧字段 -->
          <template #default="{ row }">{{ row.title || '--' }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="150" align="center">
          <template #default="{ row }">{{ row.type || '--' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.remark || '--' }}</template>
        </el-table-column>
        <el-table-column label="附件" width="80" align="center">
          <template #default="{ row }">{{ ((row.fileNameList || []).length) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看</el-button>
            <el-popconfirm
              title="确认删除该影音记录？"
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
          <el-empty :image-size="60" description="暂无影音记录" />
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

    <!-- 新增：multipart 提交，文件字段名统一 files（契约 2.8，替代 legacy 的 file1..fileN） -->
    <el-dialog v-model="addVisible" title="新增现场影音" width="520px" @closed="resetForm">
      <el-form ref="addFormRef" :model="addForm" :rules="addRules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model.trim="addForm.title" maxlength="50" placeholder="请输入标题" clearable />
        </el-form-item>

        <el-form-item label="类型" prop="type">
          <el-select v-model="addForm.type" placeholder="请选择类型" class="dialog_item">
            <el-option v-for="item in VIDEO_TYPES" :key="item" :label="item" :value="item" />
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
              <div class="upload_tip">支持多个文件，视频与图片均可；提交时以同名多部件 files 上传</div>
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
import { addVideo, deleteVideo, listVideoData } from '@/api/video';
import { getFileUrl } from '@/api/file';

const ALL_LABEL = '全部';
/** 契约 2.8：类型固定两项，legacy 前端硬编码，这里保持一致 */
const VIDEO_TYPES = ['施工技术及要求', '现场视频及图片'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const VIDEO_EXT = ['mp4', 'webm', 'ogg', 'mov', 'm4v'];

const route = useRoute();

const loading = ref(false);
const submitting = ref(false);
const tableData = ref([]);
const total = ref(0);
const addVisible = ref(false);
const detailVisible = ref(false);
const detail = ref(null);
const addFormRef = ref();

const filters = reactive({
  date: '',
  type: '',
});
const page = reactive({
  pageNum: 1,
  pageSize: 20,
});
const addForm = reactive({
  title: '',
  type: '',
  remark: '',
  fileList: [],
});

const typeOptions = computed(() => [ALL_LABEL, ...VIDEO_TYPES]);
const detailFiles = computed(() => (detail.value && detail.value.fileNameList) || []);
const imagePreviewList = computed(() => detailFiles.value.filter((name) => kindOf(name) === 'image'));

const addRules = {
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

/** 序号列：跨页连续 */
function indexOf (index) {
  return (page.pageNum - 1) * page.pageSize + index + 1;
}

async function getList () {
  loading.value = true;
  try {
    const res = await listVideoData({
      pageNum: page.pageNum,
      pageSize: page.pageSize,
      date: filters.date,
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
  filters.type = '';
  page.pageNum = 1;
  getList();
}

function openAdd () {
  resetForm();
  addVisible.value = true;
}

function resetForm () {
  addForm.title = '';
  addForm.type = '';
  addForm.remark = '';
  addForm.fileList = [];
  addFormRef.value && addFormRef.value.clearValidate();
}

async function handleAdd () {
  const valid = await addFormRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    // 只把 File 对象交给 api 层，字段名 files 由 api/video.js 拼装
    const files = addForm.fileList.map((item) => item.raw).filter(Boolean);
    await addVideo({
      title: addForm.title,
      type: addForm.type,
      remark: addForm.remark,
      files,
    });
    ElMessage.success('添加成功');
    addVisible.value = false;
    page.pageNum = 1;
    getList();
  } catch (e) {
    // 拦截器已提示，不再重复
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
    await deleteVideo({ id: row.id });
    ElMessage.success('删除成功');
    if (tableData.value.length === 1 && page.pageNum > 1) page.pageNum -= 1;
    getList();
  } catch (e) {
    // 拦截器已提示
  }
}

onMounted(() => {
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
