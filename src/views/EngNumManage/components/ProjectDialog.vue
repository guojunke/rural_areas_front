<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑项目区' : '新增项目区'"
    width="480px"
    :close-on-click-modal="false"
    append-to-body
    @closed="handleClosed"
  >
    <el-form ref="formRef" class="project-dialog_form" :model="form" :rules="rules" label-width="90px" @submit.prevent>
      <el-form-item label="项目名称" prop="projectName">
        <el-input
          v-model.trim="form.projectName"
          :maxlength="MAX_PROJECT_NAME"
          placeholder="请输入项目名称"
          clearable
        />
      </el-form-item>
    </el-form>

    <!-- legacy 的 addPro 里「描述」输入框是注释掉的，契约 2.2 的 add/update 也只收 projectName
         （项目区的 standards/title/company/leader/phone 由后端其它流程维护），
         因此这里既不明文展示也不回传那些字段。 -->

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { addProject, updateProject } from '@/api/project';

const MAX_PROJECT_NAME = 128;

const props = defineProps({
  /** null 表示新增；否则为待编辑的项目区行（{id, projectName, ...}） */
  project: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['saved']);

const visible = defineModel({ type: Boolean, default: false });

const formRef = ref();
const submitting = ref(false);
const form = reactive({ projectName: '' });

const isEdit = computed(() => !!(props.project && props.project.id !== undefined && props.project.id !== null));

const rules = {
  projectName: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { max: MAX_PROJECT_NAME, message: `项目名称不超过 ${MAX_PROJECT_NAME} 个字`, trigger: 'blur' },
  ],
};

watch(visible, (opened) => {
  if (!opened) return;
  form.projectName = (props.project && props.project.projectName) || '';
  formRef.value && formRef.value.clearValidate();
});

function handleClosed () {
  form.projectName = '';
  submitting.value = false;
  formRef.value && formRef.value.resetFields();
}

async function handleSubmit () {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (isEdit.value) {
      // 契约 2.2：只有 projectName 可编辑
      await updateProject({ id: props.project.id, projectName: form.projectName });
      ElMessage.success('项目区更新成功');
    } else {
      await addProject({ projectName: form.projectName });
      ElMessage.success('项目区新增成功');
    }
    visible.value = false;
    // 新增时后端不回传 id，页面按 projectName 在刷新后的树里定位并展开
    emit('saved', {
      mode: isEdit.value ? 'update' : 'add',
      projectId: props.project && props.project.id,
      projectName: form.projectName,
    });
  } catch (error) {
    // 失败信封（errorCode !== '0'）与网络异常都已在 utils/request.js 拦截器里 ElMessage 过，
    // 这里不再重复提示，只负责结束按钮 loading。
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
/* 弹窗骨架由 Element Plus 控制，这里不覆盖 .el-dialog__body，避免 append-to-body 后 scope 失效 */
.project-dialog_form {
  padding-right: 8px;
}
</style>
