<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑标段' : '新增标段'"
    width="520px"
    :close-on-click-modal="false"
    append-to-body
    @closed="handleClosed"
  >
    <el-form ref="formRef" class="tender-dialog_form" :model="form" :rules="rules" label-width="100px" @submit.prevent>
      <el-form-item label="所属项目区">
        <el-input :model-value="parentProjectName" disabled placeholder="—" />
      </el-form-item>

      <el-form-item label="标段名称" prop="tenderName">
        <el-input
          v-model.trim="form.tenderName"
          :maxlength="MAX_NAME"
          placeholder="请输入标段名称"
          clearable
        />
      </el-form-item>

      <el-form-item label="中标单位" prop="company">
        <el-input v-model.trim="form.company" :maxlength="MAX_COMPANY" placeholder="请输入中标单位" clearable />
      </el-form-item>

      <el-form-item label="负责人" prop="leader">
        <el-input v-model.trim="form.leader" :maxlength="MAX_LEADER" placeholder="请输入负责人" clearable />
      </el-form-item>

      <el-form-item label="负责人电话" prop="phone">
        <el-input v-model.trim="form.phone" :maxlength="MAX_PHONE" placeholder="请输入负责人电话" clearable />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { addTender, updateTender } from '@/api/tender';

// 长度上限对齐后端 tender 表列定义（tender_name 128 / company 128 / leader 64 / phone 32）
const MAX_NAME = 128;
const MAX_COMPANY = 128;
const MAX_LEADER = 64;
const MAX_PHONE = 32;

const props = defineProps({
  /** null 表示新增；否则为待编辑的标段行 */
  tender: {
    type: Object,
    default: null,
  },
  /** 标段必须挂在某个项目区下：{id, projectName} */
  parentProject: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['saved']);

const visible = defineModel({ type: Boolean, default: false });

const formRef = ref();
const submitting = ref(false);
const form = reactive({
  tenderName: '',
  company: '',
  leader: '',
  phone: '',
});

const isEdit = computed(() => !!(props.tender && props.tender.id !== undefined && props.tender.id !== null));

// 契约 1.4：统一 projectId，不再沿用 legacy 的 proId
const projectId = computed(() => {
  if (isEdit.value && props.tender.projectId !== undefined && props.tender.projectId !== null) {
    return props.tender.projectId;
  }
  return props.parentProject && props.parentProject.id;
});

const parentProjectName = computed(
  () => (props.parentProject && props.parentProject.projectName) || (props.tender && props.tender.projectName) || ''
);

// legacy 完全没有校验，标段名可以空着提交；契约里 tender_name 是 NOT NULL，这里补上必填
const rules = {
  tenderName: [
    { required: true, message: '请输入标段名称', trigger: 'blur' },
    { max: MAX_NAME, message: `标段名称不超过 ${MAX_NAME} 个字`, trigger: 'blur' },
  ],
  company: [{ max: MAX_COMPANY, message: `中标单位不超过 ${MAX_COMPANY} 个字`, trigger: 'blur' }],
  leader: [{ max: MAX_LEADER, message: `负责人不超过 ${MAX_LEADER} 个字`, trigger: 'blur' }],
  // 选填字段：async-validator 对非 required 的空值会跳过 pattern，所以填了才校验格式
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入 11 位手机号', trigger: 'blur' }],
};

watch(visible, (opened) => {
  if (!opened) return;
  const source = props.tender || {};
  form.tenderName = source.tenderName || '';
  form.company = source.company || '';
  form.leader = source.leader || '';
  form.phone = source.phone || '';
  formRef.value && formRef.value.clearValidate();
});

function handleClosed () {
  submitting.value = false;
  formRef.value && formRef.value.resetFields();
}

/** 空字符串一律转 null：契约 2.3 的可空列不该收到 "" */
function orNull (value) {
  return value === '' || value === undefined || value === null ? null : value;
}

async function handleSubmit () {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  if (projectId.value === undefined || projectId.value === null || projectId.value === '') {
    ElMessage.warning('缺少所属项目区，请重新选择');
    return;
  }

  const payload = {
    tenderName: form.tenderName,
    projectId: projectId.value,
    company: orNull(form.company),
    leader: orNull(form.leader),
    phone: orNull(form.phone),
  };

  submitting.value = true;
  try {
    if (isEdit.value) {
      await updateTender({ id: props.tender.id, ...payload });
      ElMessage.success('标段更新成功');
    } else {
      await addTender(payload);
      ElMessage.success('标段新增成功');
    }
    visible.value = false;
    emit('saved', { mode: isEdit.value ? 'update' : 'add', projectId: projectId.value });
  } catch (error) {
    // 拦截器已提示，见 utils/request.js
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
/* 同上：不覆盖弹窗骨架，只约束自己的表单宽度 */
.tender-dialog_form {
  padding-right: 8px;
}
</style>
