<template>
  <el-dialog
    :model-value="visible"
    title="今日进度更新"
    width="520px"
    append-to-body
    @update:model-value="setVisible"
  >
    <div v-if="row" class="rate_dialog">
      <div class="rate_dialog_info">
        <span>{{ row.projectName || '--' }}</span>
        <span>{{ row.tenderName || '--' }}</span>
        <span>工程种类：{{ row.name || '--' }}</span>
        <span>规格：{{ row.standards || '--' }}</span>
      </div>

      <el-form label-width="120px" size="default" @submit.prevent="handleSubmit">
        <el-form-item v-for="col in columns" :key="col.key" :label="col.label || col.key">
          <el-input-number
            v-model="form[col.key]"
            :min="0"
            :max="maxOf(col)"
            :step="1"
            :precision="0"
            controls-position="right"
            class="rate_dialog_input"
            :placeholder="`0 ~ ${maxOf(col)}`"
          />
          <span class="rate_dialog_total">
            累计进度：{{ totalOf(col) }}{{ col.unit || '' }}
          </span>
        </el-form-item>
      </el-form>

      <p class="rate_dialog_tip">输入本次新增的昨日进度，0 表示不增加；累计进度由服务端累加，此处只读。</p>
    </div>

    <template #footer>
      <el-button @click="setVisible(false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { updateProgress } from '@/api/progress';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  row: {
    type: Object,
    default: null,
  },
  // 来自 /api/progress/getProcessItems 的进度项字典，弹窗字段由此动态生成
  columns: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:visible', 'saved']);

const submitting = ref(false);
const form = reactive({});

function setVisible (value) {
  emit('update:visible', value);
}

function itemsOf (row) {
  return ((row && row.detailProcess) || {}).items || [];
}

function totalOf (col) {
  const hit = itemsOf(props.row).find((item) => item.key === col.key);
  const value = hit ? hit.totalNum : 0;
  return Number(value) || 0;
}

/** 按 legacy 规则「0 ~ (100 - 总进度)」限制昨日进度上限，百分比之外不设 100 顶 */
function maxOf (col) {
  const unit = col.unit || '%';
  if (unit !== '%') return 9999;
  return Math.max(0, 100 - totalOf(col));
}

watch(
  () => props.visible,
  (value) => {
    if (!value) return;
    Object.keys(form).forEach((key) => delete form[key]);
    props.columns.forEach((col) => {
      form[col.key] = 0;
    });
  }
);

async function handleSubmit () {
  const proTypeId = props.row && props.row.detailProcess && props.row.detailProcess.proTypeId;
  if (!proTypeId) {
    ElMessage.warning('缺少 proTypeId，无法提交');
    return;
  }
  const invalid = props.columns.find((col) => {
    const value = form[col.key];
    return value === null || value === undefined || Number.isNaN(Number(value)) || Number(value) < 0;
  });
  if (invalid) {
    ElMessage.warning(`请填写「${invalid.label || invalid.key}」的昨日进度`);
    return;
  }

  const items = props.columns.map((col) => ({
    key: col.key,
    dayNum: Number(form[col.key]) || 0,
    totalNum: totalOf(col),
  }));

  submitting.value = true;
  try {
    await updateProgress({ proTypeId, items });
    ElMessage.success('进度更新成功');
    setVisible(false);
    emit('saved');
  } catch (e) {
    // 失败提示由 utils/request.js 拦截器统一弹出
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.rate_dialog_info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
  padding: 8px 10px;
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
}

.rate_dialog_input {
  width: 150px;
}

.rate_dialog_total {
  margin-left: 12px;
  font-size: 13px;
  color: #303133;
}

.rate_dialog_tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}
</style>
