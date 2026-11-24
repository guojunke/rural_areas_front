<template>
  <div class="rate_panel">
    <!-- 筛选区：项目区 / 标段 / 工程类型（契约 2.5 getTenderProgressList） -->
    <el-form class="rate_filter" inline @submit.prevent="handleSearch">
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

      <el-form-item label="标段" required>
        <el-select
          v-model="query.tenderId"
          placeholder="请选择标段"
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

      <el-form-item label="工程类型">
        <el-select
          v-model="query.type"
          placeholder="全部类型"
          clearable
          style="width: 140px"
          @change="handleTypeChange"
        >
          <el-option
            v-for="item in typeOptions"
            :key="item.type"
            :label="item.typeName"
            :value="item.type"
          />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 选中类型时直接展示服务端字典，进度项名称完全来自 getProcessItems，前端不维护任何映射表 -->
    <p v-if="typeHint" class="rate_hint">
      <el-icon><InfoFilled /></el-icon>
      「{{ typeLabel }}」的进度项字典：{{ typeHint }}
    </p>

    <div v-loading="loading || dictLoading" class="rate_groups">
      <el-empty v-if="!groups.length && searched && !loading" description="该标段下暂无符合条件的工程量" />

      <section v-for="(group, gi) in groups" :key="`${group.type}-${gi}`" class="rate_group">
        <div class="rate_group_head">
          <span class="rate_group_name">{{ group.name || typeLabelOf(group.type) }}</span>
          <el-tag size="small" type="info">{{ group.type }}</el-tag>
          <span class="rate_group_count">{{ (group.projectTypes || []).length }} 项工程量</span>
        </div>

        <el-table :data="group.projectTypes || []" border size="small" class="rate_table">
          <el-table-column prop="projectName" label="项目区" min-width="150" align="center" show-overflow-tooltip />
          <el-table-column prop="tenderName" label="标段" min-width="90" align="center" />
          <el-table-column prop="name" label="工程量名称" min-width="120" align="center" show-overflow-tooltip />
          <el-table-column prop="standards" label="规格" min-width="110" align="center">
            <template #default="{ row }">{{ row.standards || '--' }}</template>
          </el-table-column>

          <!-- 动态列：字典里有几个进度项就渲染几列 -->
          <el-table-column
            v-for="col in columnsOf(group)"
            :key="col.key"
            :label="col.label"
            min-width="118"
            align="center"
          >
            <template #header>
              <div class="rate_col_head">
                <span class="ellipsis">{{ col.label }}</span>
                <span v-if="col.unit" class="rate_col_unit">{{ col.unit }}</span>
              </div>
            </template>
            <template #default="{ row }">
              <div class="rate_cell">
                <span class="rate_cell_total">累计 {{ numOf(row, col.key, 'totalNum') }}{{ col.unit || '' }}</span>
                <span class="rate_cell_day">昨日 {{ numOf(row, col.key, 'dayNum') }}{{ col.unit || '' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column v-if="columnsOf(group).length" label="操作" width="96" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleUpdate(group, row)">更新进度</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <ProgressUpdateDialog
      v-model:visible="dialogVisible"
      :row="dialogRow"
      :columns="dialogColumns"
      @saved="loadList"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { InfoFilled } from '@element-plus/icons-vue';
import { getAllProjectType } from '@/api/projectType';
import { getProjectList } from '@/api/project';
import { getTendersList } from '@/api/tender';
import { getProcessItems, getTenderProgressList } from '@/api/progress';

const query = reactive({
  projectId: '',
  tenderId: '',
  type: '',
});

const projectList = ref([]);
const tenderList = ref([]);
const typeMap = ref({});
const groups = ref([]);
const loading = ref(false);
const dictLoading = ref(false);
const searched = ref(false);
const dialogVisible = ref(false);
const dialogRow = ref(null);
const dialogColumns = ref([]);

/** type -> 服务端进度项字典；前端不内置任何 类型->字段 映射 */
const dictMap = reactive({});
const dictRequested = {};

const typeOptions = computed(() =>
  Object.keys(typeMap.value).map((type) => ({ type, typeName: typeMap.value[type] }))
);

const typeLabel = computed(() => typeMap.value[query.type] || query.type);

const typeHint = computed(() => {
  const items = dictMap[query.type];
  if (!items || !items.length) return '';
  return items.map((item) => `${item.label}(${item.key})`).join('、');
});

function typeLabelOf (type) {
  return typeMap.value[type] || type || '未分类';
}

function columnsOf (group) {
  const dict = dictMap[group.type];
  if (dict && dict.length) return dict;
  // 字典接口不可用时，退回服务端在 detailProcess.items 里一并下发的 label，
  // 依然不在前端硬编码类型字段
  const first = ((group.projectTypes || [])[0] || {}).detailProcess || {};
  return (first.items || []).map((item) => ({ key: item.key, label: item.label, unit: item.unit }));
}

function cellOf (row, key) {
  const items = ((row && row.detailProcess) || {}).items || [];
  return items.find((item) => item.key === key) || null;
}

function numOf (row, key, field) {
  const cell = cellOf(row, key);
  const value = cell ? cell[field] : undefined;
  return value === undefined || value === null || value === '' ? 0 : value;
}

async function ensureDict (types) {
  const pending = [...new Set(types.filter(Boolean))].filter((type) => !dictRequested[type]);
  pending.forEach((type) => {
    dictRequested[type] = true;
  });
  if (!pending.length) return;
  dictLoading.value = true;
  try {
    await Promise.all(
      pending.map(async (type) => {
        try {
          const res = await getProcessItems({ type });
          dictMap[type] = ((res.data && res.data.items) || []).map((item) => ({
            key: item.key,
            label: item.label,
            unit: item.unit,
          }));
        } catch (e) {
          dictMap[type] = [];
        }
      })
    );
  } finally {
    dictLoading.value = false;
  }
}

async function loadProjects () {
  const res = await getProjectList();
  projectList.value = res.data || [];
}

async function loadTypes () {
  const res = await getAllProjectType();
  typeMap.value = res.data || {};
}

async function loadTenders () {
  if (!query.projectId) {
    tenderList.value = [];
    return;
  }
  const res = await getTendersList({ projectId: query.projectId });
  tenderList.value = res.data || [];
}

function handleProjectChange () {
  query.tenderId = '';
  query.type = '';
  loadTenders();
}

function handleTypeChange () {
  if (query.type) ensureDict([query.type]);
}

async function loadList () {
  if (!query.projectId) {
    ElMessage.warning('请选择项目区（接口要求 projectId 必传，不再默认取第 1 个项目区）');
    return;
  }
  if (!query.tenderId) {
    ElMessage.warning('请选择要更新进度的标段');
    return;
  }
  loading.value = true;
  try {
    const res = await getTenderProgressList({
      projectId: query.projectId,
      tenderId: query.tenderId,
      type: query.type,
    });
    groups.value = res.data || [];
    searched.value = true;
    await ensureDict(groups.value.map((group) => group.type));
  } catch (e) {
    groups.value = [];
  } finally {
    loading.value = false;
  }
}

const handleSearch = loadList;

function handleReset () {
  query.projectId = '';
  query.tenderId = '';
  query.type = '';
  tenderList.value = [];
  groups.value = [];
  searched.value = false;
}

async function handleUpdate (group, row) {
  await ensureDict([group.type]);
  const columns = columnsOf(group);
  if (!columns.length) {
    ElMessage.warning('该工程类型的进度项字典为空，无法填报');
    return;
  }
  if (!row.detailProcess || !row.detailProcess.proTypeId) {
    ElMessage.warning('该工程量缺少 proTypeId，无法提交进度');
    return;
  }
  dialogColumns.value = columns;
  dialogRow.value = row;
  dialogVisible.value = true;
}

onMounted(() => {
  loadProjects().catch(() => {});
  loadTypes()
    .then(() => {
      // 字典预热：进入页面即可切换类型看到服务端字段，未选类型时不请求
      if (query.type) ensureDict([query.type]);
    })
    .catch(() => {});
});
</script>

<style lang="scss" scoped>
.rate_panel {
  min-height: 320px;
}

.rate_filter {
  padding: 4px 0 0;
}

.rate_hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  padding: 6px 10px;
  font-size: 12px;
  color: #606266;
  background: #f4f4f5;
  border-radius: 4px;
}

.rate_group {
  margin-bottom: 18px;
}

.rate_group_head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.rate_group_name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.rate_group_count {
  font-size: 12px;
  color: #909399;
}

.rate_col_head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.rate_col_unit {
  flex: none;
  font-size: 12px;
  color: #909399;
}

.rate_cell {
  display: flex;
  flex-direction: column;
  line-height: 1.5;
}

.rate_cell_total {
  color: #303133;
}

.rate_cell_day {
  font-size: 12px;
  color: var(--el-color-primary);
}
</style>
