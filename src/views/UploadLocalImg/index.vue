<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="pos_head">
          <span>{{ route.meta.title }}</span>
          <span class="pos_head_tip">
            层级：项目区 → 标段 → 工程量。图片地址由 <code>@/api/file.js</code> 的 getFileUrl 生成
            （<code>/file/download?fileName=</code>），前端不再出现服务器 IP。
          </span>
        </div>
      </template>

      <!-- 级联筛选：项目区 -> 标段 -> 工程类型 -->
      <el-form class="pos_filter" inline @submit.prevent="loadList">
        <el-form-item label="项目区">
          <el-select
            v-model="query.projectId"
            placeholder="全部项目区"
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
            @change="handleTenderChange"
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
          <el-select v-model="query.type" placeholder="全部类型" clearable style="width: 140px">
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

      <div v-loading="loading" class="pos_body">
        <el-empty v-if="!tree.length && !loading" description="暂无定位图片数据" />

        <section v-for="project in tree" :key="project.id" class="pos_project">
          <div class="pos_project_head">
            <el-icon><OfficeBuilding /></el-icon>
            <span>{{ project.projectName }}</span>
          </div>

          <div v-for="tender in project.tendersVoList || []" :key="`${project.id}-${tender.tenderId}`" class="pos_tender">
            <div class="pos_tender_head">标段：{{ tender.tenderName }}</div>

            <el-table :data="tender.projectTypePositionList || []" border size="small">
              <el-table-column prop="name" label="工程量" min-width="140" show-overflow-tooltip>
                <template #default="{ row }">{{ row.name || '--' }}</template>
              </el-table-column>
              <el-table-column prop="standards" label="规格" min-width="120">
                <template #default="{ row }">{{ row.standards || '--' }}</template>
              </el-table-column>
              <el-table-column label="类型" width="90" align="center">
                <template #default="{ row }">
                  <el-tag size="small" type="info">{{ typeNameOf(row) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="已上传定位图片" min-width="260">
                <template #default="{ row }">
                  <div v-if="iconsOf(row).length" class="pos_imgs">
                    <el-image
                      v-for="(fileName, idx) in iconsOf(row)"
                      :key="`${row.id}-${fileName}`"
                      class="pos_img"
                      :src="getFileUrl(fileName)"
                      :preview-src-list="iconsOf(row).map(getFileUrl)"
                      :initial-index="idx"
                      :preview-teleported="true"
                      fit="cover"
                      :alt="fileName"
                    >
                      <template #error>
                        <div class="pos_img_error">加载失败</div>
                      </template>
                    </el-image>
                  </div>
                  <span v-else class="pos_empty">未上传</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="110" align="center">
                <template #default="{ row }">
                  <el-button type="primary" link @click="openUpload(project, tender, row)">
                    {{ iconsOf(row).length ? '添加图片' : '上传' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>
      </div>
    </el-card>

    <PositionIconDialog
      v-model:visible="dialogVisible"
      :context="dialogContext"
      @uploaded="handleUploaded"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { OfficeBuilding } from '@element-plus/icons-vue';
import { getAllProjectType, getProjectTypeByTenderId, getPositionIconList } from '@/api/projectType';
import { getProjectList } from '@/api/project';
import { getTendersList } from '@/api/tender';
import { getFileUrl } from '@/api/file';
import PositionIconDialog from './PositionIconDialog.vue';

const route = useRoute();

const query = reactive({
  projectId: '',
  tenderId: '',
  type: '',
});

const projectList = ref([]);
const tenderList = ref([]);
const typeMap = ref({});
const tenderTypeList = ref([]);
const tree = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogContext = ref(null);
const activeSlot = ref(null);

/**
 * 类型下拉：选中标段时用该标段实际存在的工程量类型（getByTenderId），
 * 否则退回全量字典 getAllProjectType，中文名一律以字典为准。
 */
const typeOptions = computed(() => {
  if (tenderTypeList.value.length) {
    const seen = [];
    tenderTypeList.value.forEach((item) => {
      if (item.type && !seen.some((it) => it.type === item.type)) {
        seen.push({ type: item.type, typeName: typeMap.value[item.type] || item.typeName || item.type });
      }
    });
    return seen;
  }
  return Object.keys(typeMap.value).map((type) => ({ type, typeName: typeMap.value[type] }));
});

function typeNameOf (row) {
  return typeMap.value[row.type] || row.typeName || row.type || '--';
}

function iconsOf (row) {
  return row.roadIconList || [];
}

async function loadProjects () {
  const res = await getProjectList();
  projectList.value = res.data || [];
}

async function loadTypeMap () {
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

async function loadTenderTypes () {
  if (!query.tenderId) {
    tenderTypeList.value = [];
    return;
  }
  const res = await getProjectTypeByTenderId({ tenderId: query.tenderId });
  tenderTypeList.value = res.data || [];
}

async function handleProjectChange () {
  query.tenderId = '';
  query.type = '';
  tenderTypeList.value = [];
  await loadTenders();
}

async function handleTenderChange () {
  query.type = '';
  await loadTenderTypes();
}

async function loadList () {
  loading.value = true;
  try {
    const res = await getPositionIconList({
      projectId: query.projectId,
      tenderId: query.tenderId,
      type: query.type,
    });
    tree.value = res.data || [];
  } catch (e) {
    // 拦截器已提示，这里只清空渲染
    tree.value = [];
  } finally {
    loading.value = false;
  }
}

/**
 * 契约 2.4 的上传入参里 proTypeId 必填（定位图片挂在工程量上），
 * legacy 那套「按项目区 / 按标段整体上传」的入口没有工程量归属，直接下线。
 */
function openUpload (project, tender, slot) {
  if (!slot || !slot.id) {
    ElMessage.warning('请先选择要上传定位图片的工程量');
    return;
  }
  if (!project.id || !tender.tenderId) {
    ElMessage.warning('定位图片数据缺少项目区或标段信息，请重新查询');
    return;
  }
  activeSlot.value = slot;
  dialogContext.value = {
    projectId: project.id,
    projectName: project.projectName,
    tenderId: tender.tenderId,
    tenderName: tender.tenderName,
    proTypeId: slot.id,
    name: slot.name,
    type: slot.type,
    typeName: typeNameOf(slot),
  };
  dialogVisible.value = true;
}

/** 上传成功后只回查受影响的那一个工程量槽位 */
async function handleUploaded () {
  const slot = activeSlot.value;
  const ctx = dialogContext.value;
  if (!slot || !ctx) {
    loadList();
    return;
  }
  try {
    const res = await getPositionIconList({
      projectId: ctx.projectId,
      tenderId: ctx.tenderId,
      type: ctx.type,
    });
    const matched = (res.data || [])
      .flatMap((project) => project.tendersVoList || [])
      .flatMap((tender) => tender.projectTypePositionList || [])
      .find((item) => String(item.id) === String(ctx.proTypeId));
    if (matched) {
      slot.roadIconList = matched.roadIconList || [];
      return;
    }
    loadList();
  } catch (e) {
    loadList();
  }
}

function handleReset () {
  query.projectId = '';
  query.tenderId = '';
  query.type = '';
  tenderList.value = [];
  tenderTypeList.value = [];
  loadList();
}

onMounted(() => {
  loadTypeMap().catch(() => {});
  loadProjects().catch(() => {});
  loadList();
});
</script>

<style lang="scss" scoped>
.pos_head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.pos_head_tip {
  font-size: 12px;
  font-weight: 400;
  color: #909399;

  code {
    padding: 1px 4px;
    font-size: 12px;
    background: #f2f3f5;
    border-radius: 2px;
  }
}

.pos_filter {
  padding: 4px 0 0;
}

.pos_project {
  margin-bottom: 18px;
}

.pos_project_head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.pos_tender {
  margin-bottom: 12px;
}

.pos_tender_head {
  margin: 0 0 6px;
  font-size: 13px;
  color: #606266;
}

.pos_imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pos_img {
  width: 72px;
  height: 54px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: zoom-in;
}

.pos_img_error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12px;
  color: #c0c4cc;
  background: #f5f7fa;
}

.pos_empty {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
