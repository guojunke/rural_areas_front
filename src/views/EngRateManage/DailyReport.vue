<template>
  <div class="rate_panel">
    <!-- 筛选区：报告日期 + 项目区 + 标段（契约 2.6，只读列表） -->
    <el-form class="rate_filter" inline @submit.prevent="handleSearch">
      <el-form-item label="报告日期">
        <el-date-picker
          v-model="query.date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="全部日期"
          style="width: 160px"
        />
      </el-form-item>

      <el-form-item label="项目区" required>
        <el-select
          v-model="query.projectId"
          placeholder="请选择项目区"
          clearable
          style="width: 200px"
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
          v-model="query.tenderId"
          placeholder="全部标段"
          clearable
          :disabled="!query.projectId"
          style="width: 160px"
        >
          <el-option
            v-for="item in tenderList"
            :key="item.id"
            :label="item.tenderName"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="tableData"
      border
      size="small"
      class="rate_table"
      :empty-text="emptyText"
    >
      <el-table-column type="index" label="编号" width="70" align="center" :index="indexMethod" />
      <el-table-column prop="gmtCreate" label="报告时间" min-width="160" align="center" />
      <el-table-column prop="projectName" label="项目区" min-width="160" align="center" show-overflow-tooltip />
      <el-table-column prop="tenderName" label="标段" min-width="100" align="center" />
      <el-table-column prop="content" label="报告内容" min-width="280" show-overflow-tooltip />
      <el-table-column label="操作" width="90" align="center">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="rate_pager"
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      :page-sizes="[10, 20, 50]"
      v-model:current-page="query.pageNum"
      v-model:page-size="query.pageSize"
      @size-change="handleSearch"
      @current-change="loadList"
    />

    <el-dialog v-model="detailVisible" title="日进度报告详情" width="520px">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="报告时间">{{ detailRow.gmtCreate || '--' }}</el-descriptions-item>
        <el-descriptions-item label="项目区">{{ detailRow.projectName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="标段">{{ detailRow.tenderName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="报告内容">
          <p class="rate_content">{{ detailRow.content || '--' }}</p>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getDailyPaperList } from '@/api/dailyPaper';
import { getProjectList } from '@/api/project';
import { getTendersList } from '@/api/tender';

const query = reactive({
  date: '',
  projectId: '',
  tenderId: '',
  pageNum: 1,
  pageSize: 20,
});

const projectList = ref([]);
const tenderList = ref([]);
const tableData = ref([]);
const total = ref(0);
const loading = ref(false);
const searched = ref(false);
const detailVisible = ref(false);
const detailRow = ref({});

/**
 * 未查询前不显示「暂无数据」，而是提示必填项。
 * 契约 4 把 legacy「项目区为空默认取 1」的行为废止，projectId 为必传，
 * 所以这里用校验拦截请求，而不是带着空参数去打接口。
 */
const emptyText = computed(() => {
  if (!searched.value) return '请选择项目区后点击查询';
  return '暂无数据';
});

function indexMethod (index) {
  return (query.pageNum - 1) * query.pageSize + index + 1;
}

async function loadProjects () {
  const res = await getProjectList();
  projectList.value = res.data || [];
}

async function loadTenders () {
  // 项目区必传，未选时标段下拉直接清空，避免出现跨项目区的脏选项
  if (!query.projectId) {
    tenderList.value = [];
    return;
  }
  const res = await getTendersList({ projectId: query.projectId });
  tenderList.value = res.data || [];
}

function handleProjectChange () {
  query.tenderId = '';
  loadTenders();
}

async function loadList () {
  loading.value = true;
  try {
    const res = await getDailyPaperList({
      date: query.date,
      projectId: query.projectId,
      tenderId: query.tenderId,
      pageNum: query.pageNum,
      pageSize: query.pageSize,
    });
    const data = res.data || {};
    tableData.value = data.dataList || [];
    total.value = data.total || 0;
  } catch (e) {
    // 失败信封已由 utils/request.js 统一弹提示，这里只保证列表不残留脏数据
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
    searched.value = true;
  }
}

function handleSearch () {
  if (!query.projectId) {
    ElMessage.warning('请选择项目区（接口要求 projectId 必传，不再默认取第 1 个项目区）');
    return;
  }
  query.pageNum = 1;
  loadList();
}

function handleReset () {
  query.date = '';
  query.projectId = '';
  query.tenderId = '';
  tenderList.value = [];
  tableData.value = [];
  total.value = 0;
  query.pageNum = 1;
  searched.value = false;
}

function handleDetail (row) {
  detailRow.value = row;
  detailVisible.value = true;
}

onMounted(() => {
  loadProjects().catch(() => {});
});
</script>

<style lang="scss" scoped>
.rate_panel {
  min-height: 320px;
}

.rate_filter {
  padding: 4px 0 0;
}

.rate_pager {
  justify-content: flex-end;
  margin-top: 12px;
}

.rate_content {
  margin: 0;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
