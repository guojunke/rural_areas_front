<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="panel_header">
          <span class="panel_title">{{ route.meta.title }}</span>
          <span class="panel_hint">通知单由移动端写入，后台仅支持查看与删除</span>
        </div>
      </template>

      <!-- 筛选区：项目区 -> 标段 级联，切换项目区重新拉取标段并清空已选标段（契约 2.3） -->
      <el-form class="filter_bar" :inline="true" label-width="0" @submit.prevent="handleSearch">
        <el-form-item label="项目区">
          <el-select
            v-model="filters.projectId"
            placeholder="全部项目区"
            clearable
            class="filter_item"
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

        <el-form-item label="标段">
          <el-select
            v-model="filters.tenderId"
            placeholder="全部标段"
            clearable
            class="filter_item"
            :loading="tenderLoading"
          >
            <el-option
              v-for="item in tenderList"
              :key="item.id"
              :label="item.tenderName || '--'"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="类型">
          <!-- "全部"用空串作值：request.js 会剔除空的 GET 参数，不会产生 type= -->
          <el-select v-model="filters.type" class="filter_item">
            <el-option v-for="item in typeOptions" :key="item" :label="item" :value="optionValue(item)" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="num" label="编号" width="120" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.num || '--' }}</template>
        </el-table-column>
        <el-table-column prop="projectName" label="项目区" min-width="140" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.projectName || '--' }}</template>
        </el-table-column>
        <el-table-column prop="tenderName" label="标段" min-width="140" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.tenderName || '--' }}</template>
        </el-table-column>
        <el-table-column prop="type" label="通知单类型" width="120" align="center">
          <template #default="{ row }">{{ row.type || '--' }}</template>
        </el-table-column>
        <el-table-column prop="proTypeName" label="工程" width="100" align="center">
          <template #default="{ row }">{{ row.proTypeName || '--' }}</template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.content || '--' }}</template>
        </el-table-column>
        <el-table-column label="附件" width="80" align="center">
          <template #default="{ row }">{{ attachmentCount(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看</el-button>
            <el-popconfirm
              title="确认删除该通知单？"
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
          <el-empty :image-size="60" description="暂无通知单" />
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

    <!-- 详情：legacy 读的是 sourceIconNameList 且对字符串数组做 slice，契约 2.7 统一为 fileNameList -->
    <el-dialog v-model="detailVisible" title="通知单信息" width="600px">
      <el-descriptions v-if="detail" :column="1" border size="small">
        <el-descriptions-item label="编号">{{ detail.num || '--' }}</el-descriptions-item>
        <el-descriptions-item label="项目区">{{ detail.projectName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="标段">{{ detail.tenderName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.type || '--' }}</el-descriptions-item>
        <el-descriptions-item label="工程">{{ detail.proTypeName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="发布时间">{{ detail.gmtCreate || '--' }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ detail.content || '--' }}</el-descriptions-item>
        <el-descriptions-item label="附件">
          <div v-if="detailFileList.length" class="attachment_list">
            <a
              v-for="name in detailFileList"
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

      <!-- 图片/视频附件直接内联预览，地址同样来自 /file/download -->
      <div v-if="detail" class="attachment_media">
        <template v-for="name in detailFileList" :key="`media-${name}`">
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
import { RefreshLeft, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { deleteNotice, getAllNoticeType, listNotice } from '@/api/notice';
import { getProjectList } from '@/api/project';
import { getTendersList } from '@/api/tender';
import { getFileUrl } from '@/api/file';

/** 类型下拉里"全部"这一项的显示文案，查询时转成空串（不落库、不发给后端） */
const ALL_LABEL = '全部';
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const VIDEO_EXT = ['mp4', 'webm', 'ogg', 'mov', 'm4v'];

const route = useRoute();

const loading = ref(false);
const tenderLoading = ref(false);
const tableData = ref([]);
const total = ref(0);
const projectList = ref([]);
const tenderList = ref([]);
const typeList = ref([]);
const detailVisible = ref(false);
const detail = ref(null);

const filters = reactive({
  projectId: '',
  tenderId: '',
  type: '',
});
const page = reactive({
  pageNum: 1,
  pageSize: 20,
});

const typeOptions = computed(() => [ALL_LABEL, ...typeList.value]);
const detailFileList = computed(() => (detail.value && detail.value.fileNameList) || []);
const imagePreviewList = computed(() => detailFileList.value.filter((name) => kindOf(name) === 'image'));

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

function attachmentCount (row) {
  return ((row && row.fileNameList) || []).length;
}

/** GET /api/notice/getAllNoticeType，"全部"由前端前置（契约 2.7） */
async function getTypeList () {
  try {
    const res = await getAllNoticeType();
    typeList.value = (res && res.data) || [];
  } catch (e) {
    typeList.value = [];
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

/** 级联：projectId 为空时 request.js 会丢掉该参数，等价于查全部标段 */
async function fetchTenderList () {
  tenderLoading.value = true;
  try {
    const res = await getTendersList({ projectId: filters.projectId });
    tenderList.value = (res && res.data) || [];
  } catch (e) {
    tenderList.value = [];
  } finally {
    tenderLoading.value = false;
  }
}

function handleProjectChange () {
  filters.tenderId = '';
  fetchTenderList();
}

async function getList () {
  loading.value = true;
  try {
    const res = await listNotice({
      pageNum: page.pageNum,
      pageSize: page.pageSize,
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
  filters.projectId = '';
  filters.tenderId = '';
  filters.type = '';
  page.pageNum = 1;
  fetchTenderList();
  getList();
}

function openDetail (row) {
  detail.value = row;
  detailVisible.value = true;
}

async function handleDelete (row) {
  try {
    await deleteNotice({ id: row.id });
    ElMessage.success('删除成功');
    // 删掉当前页最后一条时往前翻一页，避免停在空页
    if (tableData.value.length === 1 && page.pageNum > 1) page.pageNum -= 1;
    getList();
  } catch (e) {
    // 失败信封已由 request.js 统一 ElMessage，这里不重复提示
  }
}

onMounted(() => {
  getTypeList();
  getProjectListData();
  fetchTenderList();
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

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
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
