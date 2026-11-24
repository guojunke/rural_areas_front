<template>
  <el-dialog
    v-model="visible"
    title="提示"
    width="440px"
    :close-on-click-modal="false"
    append-to-body
    @closed="handleClosed"
  >
    <div class="delete-dialog_body">
      <el-icon class="delete-dialog_icon"><Delete /></el-icon>
      <p class="delete-dialog_text">是否确认删除该{{ levelConfig.label }}？</p>
      <p v-if="target && target.name" class="delete-dialog_name">{{ target.name }}</p>
      <p class="delete-dialog_tip">删除后不可恢复</p>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="danger" :loading="submitting" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';
import { deleteProject } from '@/api/project';
import { deleteTender } from '@/api/tender';
import { deleteProjectType } from '@/api/projectType';

/**
 * 三级共用一个删除弹窗，按层级选接口（契约 2.2 / 2.3 / 2.4 的 delete 都是 POST + {id} 请求体）。
 * legacy 在 menuComm.vue 里监听 @deleteBackEvent，而 deleteDialog 实际 emit 的是
 * deleteDialogSucessEvent，标段删除成功后整棵树从不刷新。这里弹窗只挂在页面级，
 * 组件 emit('deleted') 与父级 @deleted 一一对应。
 */
const LEVELS = {
  project: { label: '项目区', api: deleteProject },
  tender: { label: '标段', api: deleteTender },
  projectType: { label: '工程量', api: deleteProjectType },
};

const props = defineProps({
  /** {level: 'project'|'tender'|'projectType', id, name, projectId?, tenderId?} */
  target: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['deleted']);

const visible = defineModel({ type: Boolean, default: false });
const submitting = ref(false);

const levelConfig = computed(() => LEVELS[(props.target && props.target.level) || ''] || { label: '数据', api: null });

watch(visible, (opened) => {
  if (!opened) submitting.value = false;
});

function handleClosed () {
  submitting.value = false;
}

async function handleConfirm () {
  const { api } = levelConfig.value;
  if (!api) {
    ElMessage.error(`未知的删除类型：${props.target && props.target.level}`);
    return;
  }
  if (!props.target || props.target.id === undefined || props.target.id === null) {
    ElMessage.error('缺少要删除的记录 id');
    return;
  }

  submitting.value = true;
  try {
    // legacy 是 `/tender/delete?id=xxx` 查询串 + 空 body，契约统一为请求体 {id}
    await api({ id: props.target.id });
    ElMessage.success(`${levelConfig.value.label}删除成功`);
    visible.value = false;
    emit('deleted', { ...props.target });
  } catch (error) {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.delete-dialog_body {
  padding: 4px 0 0;
  text-align: center;
  border-top: 2px solid var(--el-color-primary);
}

.delete-dialog_icon {
  margin-top: 16px;
  font-size: 32px;
  color: var(--el-color-primary);
}

.delete-dialog_text {
  margin: 12px 0 4px;
  font-size: 14px;
  color: #303133;
}

.delete-dialog_name {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
  word-break: break-all;
}

.delete-dialog_tip {
  margin: 0 0 8px;
  font-size: 12px;
  color: #909399;
}
</style>
