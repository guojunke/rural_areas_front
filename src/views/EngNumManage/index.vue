<template>
  <div class="app-container eng-num">
    <el-card shadow="never">
      <template #header>
        <div class="eng-num_header">
          <span class="eng-num_header_title">{{ route.meta.title }}</span>
          <span class="eng-num_header_summary">
            项目区 {{ tree.length }} 个 · 标段 {{ summary.tenders }} 个 · 工程量 {{ summary.types }} 条
          </span>
        </div>
      </template>

      <!-- 筛选栏：项目区变更 -> 重拉标段字典并清空已选标段（legacy TenderManage.proChangeEvent 的行为） -->
      <div class="eng-num_filter">
        <div class="eng-num_filter_item">
          <span class="eng-num_filter_label">项目区：</span>
          <el-select
            v-model="filters.projectId"
            class="eng-num_filter_select"
            placeholder="全部项目区"
            clearable
            :loading="projectOptionsLoading"
            @change="handleProjectChange"
          >
            <el-option
              v-for="item in projectOptions"
              :key="item.id"
              :label="item.projectName"
              :value="item.id"
            />
          </el-select>
        </div>

        <div class="eng-num_filter_item">
          <span class="eng-num_filter_label">标段：</span>
          <el-select
            v-model="filters.tenderId"
            class="eng-num_filter_select"
            placeholder="全部标段"
            clearable
            :loading="tenderOptionsLoading"
          >
            <el-option v-for="item in tenderOptions" :key="item.id" :label="item.tenderName" :value="item.id" />
          </el-select>
        </div>

        <el-button type="primary" :loading="treeLoading" @click="loadTree">搜索</el-button>
        <el-button @click="resetFilter">重置</el-button>

        <div class="eng-num_filter_right">
          <el-button link type="primary" @click="expandAll(true)">展开全部</el-button>
          <el-button link type="primary" @click="expandAll(false)">收起全部</el-button>
          <el-button type="primary" :icon="Plus" @click="openProjectDialog()">新增项目区</el-button>
        </div>
      </div>

      <div v-loading="treeLoading" class="eng-num_table">
        <div class="eng-num_row eng-num_row_head">
          <span class="eng-num_col eng-num_col_name">名称</span>
          <span class="eng-num_col eng-num_col_type">类型</span>
          <span class="eng-num_col">规格</span>
          <span class="eng-num_col">数量</span>
          <span class="eng-num_col">综合单价</span>
          <span class="eng-num_col eng-num_col_desc">描述</span>
          <span class="eng-num_col">中标单位</span>
          <span class="eng-num_col">负责人</span>
          <span class="eng-num_col eng-num_col_phone">负责人电话</span>
          <span class="eng-num_col eng-num_col_action">操作</span>
        </div>

        <el-empty v-if="!treeLoading && !tree.length" description="暂无项目区数据" />

        <div v-for="project in tree" :key="`project-${project.id}`" class="eng-num_block">
          <!-- 第一级：项目区 -->
          <div class="eng-num_row eng-num_row_project">
            <span class="eng-num_col eng-num_col_name">
              <el-icon
                v-if="hasChildren(project)"
                class="eng-num_arrow"
                :class="{ 'is-expanded': isExpanded('p', project.id) }"
                @click="toggle('p', project.id)"
              >
                <ArrowRight />
              </el-icon>
              <el-icon v-else class="eng-num_arrow eng-num_arrow_placeholder"><ArrowRight /></el-icon>
              <span class="eng-num_level eng-num_level_project">项目区</span>
              <span class="eng-num_name" :title="project.projectName" @click="toggle('p', project.id)">
                {{ project.projectName }}
              </span>
              <span class="eng-num_count">{{ countOf(project.tenderList) }} 标段 / {{ countTypesOf(project) }} 工程量</span>
            </span>
            <span class="eng-num_col eng-num_col_type">—</span>
            <span class="eng-num_col" :title="project.standards">{{ dash(project.standards) }}</span>
            <span class="eng-num_col">—</span>
            <span class="eng-num_col">—</span>
            <span class="eng-num_col eng-num_col_desc" :title="project.title">{{ dash(project.title) }}</span>
            <span class="eng-num_col" :title="project.company">{{ dash(project.company) }}</span>
            <span class="eng-num_col" :title="project.leader">{{ dash(project.leader) }}</span>
            <span class="eng-num_col eng-num_col_phone" :title="project.phone">{{ dash(project.phone) }}</span>
            <span class="eng-num_col eng-num_col_action">
              <el-button size="small" type="primary" @click="openTenderDialog(project)">添加标段</el-button>
              <el-button size="small" type="success" @click="openProjectDialog(project)">编辑</el-button>
              <el-button size="small" type="danger" @click="openDeleteDialog('project', project)">删除</el-button>
            </span>
          </div>

          <!-- 第二级：标段 -->
          <template v-if="isExpanded('p', project.id)">
            <div v-for="tender in project.tenderList || []" :key="`tender-${tender.id}`" class="eng-num_sub">
              <div class="eng-num_row eng-num_row_tender">
                <span class="eng-num_col eng-num_col_name eng-num_col_name_tender">
                  <el-icon
                    v-if="hasChildren(tender)"
                    class="eng-num_arrow"
                    :class="{ 'is-expanded': isExpanded('t', tender.id) }"
                    @click="toggle('t', tender.id)"
                  >
                    <ArrowRight />
                  </el-icon>
                  <el-icon v-else class="eng-num_arrow eng-num_arrow_placeholder"><ArrowRight /></el-icon>
                  <span class="eng-num_level eng-num_level_tender">标段</span>
                  <span class="eng-num_name" :title="tender.tenderName" @click="toggle('t', tender.id)">
                    {{ tender.tenderName }}
                  </span>
                  <span class="eng-num_count">{{ countOf(tender.projectTypeList) }} 工程量</span>
                </span>
                <span class="eng-num_col eng-num_col_type">—</span>
                <span class="eng-num_col" :title="tender.standards">{{ dash(tender.standards) }}</span>
                <span class="eng-num_col">—</span>
                <span class="eng-num_col">—</span>
                <span class="eng-num_col eng-num_col_desc" :title="tender.title">{{ dash(tender.title) }}</span>
                <span class="eng-num_col" :title="tender.company">{{ dash(tender.company) }}</span>
                <span class="eng-num_col" :title="tender.leader">{{ dash(tender.leader) }}</span>
                <span class="eng-num_col eng-num_col_phone" :title="tender.phone">{{ dash(tender.phone) }}</span>
                <span class="eng-num_col eng-num_col_action">
                  <el-button size="small" type="primary" @click="openTypeDialog(project, tender)">添加工程量</el-button>
                  <el-button size="small" type="success" @click="openTenderDialog(project, tender)">编辑</el-button>
                  <el-button size="small" type="danger" @click="openDeleteDialog('tender', tender)">删除</el-button>
                </span>
              </div>

              <!-- 第三级：工程量 -->
              <template v-if="isExpanded('t', tender.id)">
                <div
                  v-for="record in tender.projectTypeList || []"
                  :key="`type-${record.id}`"
                  class="eng-num_row eng-num_row_type"
                >
                  <span class="eng-num_col eng-num_col_name eng-num_col_name_type">
                    <span class="eng-num_level eng-num_level_type">工程量</span>
                    <span class="eng-num_name" :title="record.name">{{ record.name }}</span>
                  </span>
                  <span class="eng-num_col eng-num_col_type">{{ record.typeName || record.type || '—' }}</span>
                  <span class="eng-num_col" :title="record.standards">{{ dash(record.standards) }}</span>
                  <span class="eng-num_col" :title="record.quantity">{{ dash(record.quantity) }}</span>
                  <span class="eng-num_col">{{ record.contractPrice === null || record.contractPrice === undefined || record.contractPrice === '' ? '—' : `${record.contractPrice} 元` }}</span>
                  <!-- 契约 1.4：legacy 的 desc 已改名 description -->
                  <span class="eng-num_col eng-num_col_desc" :title="record.description">{{ dash(record.description) }}</span>
                  <span class="eng-num_col">—</span>
                  <span class="eng-num_col">—</span>
                  <span class="eng-num_col eng-num_col_phone">—</span>
                  <span class="eng-num_col eng-num_col_action">
                    <el-button size="small" type="success" @click="openTypeDialog(project, tender, record)">编辑</el-button>
                    <el-button size="small" type="danger" @click="openDeleteDialog('projectType', record, tender)">删除</el-button>
                  </span>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </el-card>

    <!-- 三级表单/删除弹窗都在页面级挂一份：legacy 是每个节点各挂一份再逐层 $emit，
         事件名一写错（标段删除就是如此）上层就收不到，这里只有一层父子，事件名可静态对齐。 -->
    <project-dialog v-model="projectDialogVisible" :project="editingProject" @saved="handleProjectSaved" />
    <tender-dialog
      v-model="tenderDialogVisible"
      :tender="editingTender"
      :parent-project="tenderParent"
      @saved="handleTenderSaved"
    />
    <project-type-dialog
      v-model="typeDialogVisible"
      :record="editingType"
      :parent="typeParent"
      @saved="handleTypeSaved"
    />
    <delete-dialog v-model="deleteDialogVisible" :target="deleteTarget" @deleted="handleDeleted" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowRight, Plus } from '@element-plus/icons-vue';
import { getBackendProjectIndex, getProjectList } from '@/api/project';
import { getTendersList } from '@/api/tender';
import { getProjectTypeByTenderId } from '@/api/projectType';
import ProjectDialog from './components/ProjectDialog.vue';
import TenderDialog from './components/TenderDialog.vue';
import ProjectTypeDialog from './components/ProjectTypeDialog.vue';
import DeleteDialog from './components/DeleteDialog.vue';

const route = useRoute();

const tree = ref([]);
const projectOptions = ref([]);
const tenderOptions = ref([]);
const filters = reactive({ projectId: '', tenderId: '' });

const treeLoading = ref(false);
const projectOptionsLoading = ref(false);
const tenderOptionsLoading = ref(false);

/** 展开状态：legacy 用下标数组 isShowList，数据刷新/筛选后下标会错位，这里用 id 键 */
const expanded = ref(new Set());

const projectDialogVisible = ref(false);
const editingProject = ref(null);
const tenderDialogVisible = ref(false);
const editingTender = ref(null);
const tenderParent = ref({});
const typeDialogVisible = ref(false);
const editingType = ref(null);
const typeParent = ref({});
const deleteDialogVisible = ref(false);
const deleteTarget = ref(null);

const summary = computed(() => {
  let tenders = 0;
  let types = 0;
  tree.value.forEach((project) => {
    const list = project.tenderList || [];
    tenders += list.length;
    list.forEach((tender) => {
      types += (tender.projectTypeList || []).length;
    });
  });
  return { tenders, types };
});

function dash (value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function countOf (list) {
  return (list || []).length;
}

function countTypesOf (project) {
  return (project.tenderList || []).reduce((total, tender) => total + (tender.projectTypeList || []).length, 0);
}

function hasChildren (node) {
  if (node.tenderList) return node.tenderList.length > 0;
  return (node.projectTypeList || []).length > 0;
}

function expandKey (kind, id) {
  return `${kind}:${id}`;
}

function isExpanded (kind, id) {
  return expanded.value.has(expandKey(kind, id));
}

function toggle (kind, id) {
  const key = expandKey(kind, id);
  if (expanded.value.has(key)) {
    expanded.value.delete(key);
  } else {
    expanded.value.add(key);
  }
}

function expandAll (open) {
  const next = new Set();
  if (open) {
    tree.value.forEach((project) => {
      next.add(expandKey('p', project.id));
      (project.tenderList || []).forEach((tender) => next.add(expandKey('t', tender.id)));
    });
  }
  expanded.value = next;
}

/** 删除后展开集合里会留下已经不存在的 id，刷完树清一遍 */
function pruneExpanded () {
  const alive = new Set();
  tree.value.forEach((project) => {
    alive.add(expandKey('p', project.id));
    (project.tenderList || []).forEach((tender) => alive.add(expandKey('t', tender.id)));
  });
  const next = new Set();
  expanded.value.forEach((key) => {
    if (alive.has(key)) next.add(key);
  });
  expanded.value = next;
}

function findTender (tenderId) {
  for (const project of tree.value) {
    const hit = (project.tenderList || []).find((tender) => String(tender.id) === String(tenderId));
    if (hit) return hit;
  }
  return null;
}

/* ------------------------------ 数据加载 ------------------------------ */

async function loadTree () {
  treeLoading.value = true;
  try {
    // 契约 2.2：一次返回 项目区 -> tenderList -> projectTypeList 整棵树；空筛选项由拦截器剔除
    const res = await getBackendProjectIndex({ projectId: filters.projectId, tenderId: filters.tenderId });
    tree.value = (res && res.data) || [];
    pruneExpanded();
  } catch (error) {
    tree.value = [];
  } finally {
    treeLoading.value = false;
  }
}

async function loadProjectOptions () {
  projectOptionsLoading.value = true;
  try {
    const res = await getProjectList();
    projectOptions.value = (res && res.data) || [];
  } catch (error) {
    projectOptions.value = [];
  } finally {
    projectOptionsLoading.value = false;
  }
}

async function loadTenderOptions () {
  tenderOptionsLoading.value = true;
  try {
    const res = await getTendersList({ projectId: filters.projectId });
    tenderOptions.value = (res && res.data) || [];
  } catch (error) {
    tenderOptions.value = [];
  } finally {
    tenderOptionsLoading.value = false;
  }
}

function handleProjectChange () {
  // legacy 行为：换项目区必须把已选标段清空，标段字典按 projectId 重取
  filters.tenderId = '';
  loadTenderOptions();
}

function resetFilter () {
  filters.projectId = '';
  filters.tenderId = '';
  loadTenderOptions();
  loadTree();
}

/* ------------------------------ 弹窗调度 ------------------------------ */

function openProjectDialog (project = null) {
  editingProject.value = project;
  projectDialogVisible.value = true;
}

function openTenderDialog (project, tender = null) {
  // 契约 2.2 的树里标段对象不带 projectId，父级 id 只能从外层节点取
  tenderParent.value = { id: project.id, projectName: project.projectName };
  editingTender.value = tender;
  tenderDialogVisible.value = true;
}

function openTypeDialog (project, tender, record = null) {
  typeParent.value = {
    projectId: project.id,
    tenderId: tender.id,
    projectName: project.projectName,
    tenderName: tender.tenderName,
  };
  editingType.value = record;
  typeDialogVisible.value = true;
  expanded.value.add(expandKey('t', tender.id));
}

function openDeleteDialog (level, record, tender) {
  const name = record.projectName || record.tenderName || record.name;
  deleteTarget.value = {
    level,
    id: record.id,
    name,
    // 删工程量只刷所在标段这一棵子树，需要把父标段一起带上
    tenderId: level === 'projectType' && tender ? tender.id : undefined,
  };
  deleteDialogVisible.value = true;
}

/* ------------------------------ 保存 / 删除后刷新 ------------------------------ */

async function handleProjectSaved (payload = {}) {
  await loadTree();
  // 新增的项目区自动展开，用户能立刻看到结果
  if (payload.mode === 'add' && payload.projectName) {
    const hit = tree.value.find((item) => item.projectName === payload.projectName);
    if (hit) expanded.value.add(expandKey('p', hit.id));
  }
}

async function handleTenderSaved (payload = {}) {
  await loadTree();
  if (payload.projectId !== undefined && payload.projectId !== null) {
    expanded.value.add(expandKey('p', payload.projectId));
  }
}

async function handleTypeSaved (payload = {}) {
  await refreshTenderTypes(payload.tenderId);
}

async function handleDeleted (target) {
  if (target.level === 'projectType') {
    await refreshTenderTypes(target.tenderId);
    return;
  }
  await loadTree();
}

/**
 * 工程量只影响单个标段的子树，用契约 2.4 的 getByTenderId 精准刷新；
 * 标段已不在当前树上（被筛掉）时退回整树刷新。
 */
async function refreshTenderTypes (tenderId) {
  if (tenderId === undefined || tenderId === null || tenderId === '') {
    await loadTree();
    return;
  }
  const tender = findTender(tenderId);
  if (!tender) {
    await loadTree();
    return;
  }
  try {
    const res = await getProjectTypeByTenderId({ tenderId });
    tender.projectTypeList = (res && res.data) || [];
  } catch (error) {
    await loadTree();
  }
}

onMounted(() => {
  loadProjectOptions();
  loadTenderOptions();
  loadTree();
});
</script>

<style lang="scss" scoped>
$grid-columns: minmax(240px, 1.5fr) 72px 100px 90px 104px minmax(150px, 1.1fr) 130px 90px 118px 210px;

.eng-num_header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;

  &_title {
    font-size: 16px;
    font-weight: 600;
  }

  &_summary {
    font-size: 13px;
    color: #909399;
  }
}

.eng-num_filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;

  &_item {
    display: flex;
    align-items: center;
  }

  &_label {
    color: #606266;
    white-space: nowrap;
  }

  &_select {
    width: 200px;
  }

  &_right {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
}

.eng-num_table {
  overflow-x: auto;
  min-height: 240px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.eng-num_row {
  display: grid;
  grid-template-columns: $grid-columns;
  align-items: center;
  min-width: 1180px;
  border-bottom: 1px solid #ebeef5;

  &.eng-num_row_head {
    font-weight: 600;
    color: #303133;
    background: #fafafa;
  }

  &.eng-num_row_project {
    background: #f7fbff;
  }

  &:hover:not(.eng-num_row_head) {
    background: #f5f7fa;
  }
}

/* 只做视觉分组：容器上加 padding/border 会让内层 grid 变窄，列就与表头错位了 */
.eng-num_sub {
  .eng-num_row_tender {
    background: #fffdf7;
  }

  .eng-num_row_type {
    background: #fbfbfd;
  }
}

.eng-num_col {
  padding: 8px 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-right: 1px solid #f2f3f5;

  &:last-child {
    border-right: none;
  }
}

.eng-num_col_name {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  /* 缩进只加在名称单元格里：外层容器加 padding 会让子级 grid 变窄、列对不齐 */
  &_tender {
    padding-left: 28px;
  }

  &_type {
    padding-left: 56px;
  }
}

.eng-num_col_desc {
  min-width: 120px;
}

.eng-num_col_phone {
  min-width: 100px;
}

.eng-num_col_action {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.eng-num_arrow {
  flex: none;
  font-size: 14px;
  color: #909399;
  cursor: pointer;
  transition: transform 0.2s ease;

  &.is-expanded {
    transform: rotate(90deg);
  }

  &_placeholder {
    opacity: 0;
    pointer-events: none;
  }
}

.eng-num_level {
  flex: none;
  padding: 0 6px;
  font-size: 12px;
  line-height: 18px;
  border-radius: 3px;

  &_project {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &_tender {
    color: #b88230;
    background: #fdf6ec;
  }

  &_type {
    color: #529b2e;
    background: #f0f9eb;
  }
}

.eng-num_name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
}

.eng-num_count {
  flex: none;
  font-size: 12px;
  color: #a8abb2;
}
</style>
