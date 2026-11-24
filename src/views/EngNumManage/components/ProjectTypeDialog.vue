<template>
  <el-dialog
    v-model="visible"
    class="type-dialog"
    :title="isEdit ? '编辑工程量' : '新增工程量'"
    width="560px"
    :close-on-click-modal="false"
    append-to-body
    @closed="handleClosed"
  >
    <div class="type-dialog_breadcrumb">
      所属：{{ parent.projectName || '—' }} / {{ parent.tenderName || '—' }}
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent>
      <el-form-item label="工程种类" prop="type">
        <el-select
          v-model="form.type"
          placeholder="请选择工程种类"
          :loading="typesLoading"
          style="width: 240px"
        >
          <el-option v-for="item in typeOptions" :key="item.code" :label="item.label" :value="item.code" />
        </el-select>
      </el-form-item>

      <el-form-item :label="schema.nameLabel" prop="name">
        <el-input
          v-model.trim="form.name"
          :maxlength="MAX_NAME"
          :placeholder="`请输入${schema.nameLabel}`"
          clearable
        />
      </el-form-item>

      <el-form-item v-if="schema.standards" :label="schema.standards.label" prop="standards">
        <div class="type-dialog_inline">
          <el-input
            v-model.trim="form.standards"
            :maxlength="MAX_STANDARDS"
            :placeholder="schema.standards.placeholder"
            class="type-dialog_inline_input"
          />
          <span v-if="schema.standards.unit" class="type-dialog_unit">{{ schema.standards.unit }}</span>
        </div>
      </el-form-item>

      <el-form-item v-if="schema.quantity" :label="schema.quantity.label" prop="quantity">
        <div class="type-dialog_inline">
          <el-input
            v-model.trim="form.quantity"
            :maxlength="MAX_QUANTITY"
            :placeholder="schema.quantity.placeholder"
            class="type-dialog_inline_input"
          />
          <span v-if="schema.quantity.unit" class="type-dialog_unit">{{ schema.quantity.unit }}</span>
        </div>
      </el-form-item>

      <el-form-item label="综合单价" prop="contractPrice">
        <el-input-number
          v-model="form.contractPrice"
          :min="0"
          :precision="2"
          :controls="false"
          placeholder="请输入综合单价"
          class="type-dialog_price"
        />
        <span class="type-dialog_unit">元</span>
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <!-- 契约 1.4：legacy 的 desc 是 MySQL 保留字，这里字段名一律 description，不出现 desc -->
        <el-input
          v-model.trim="form.description"
          type="textarea"
          :rows="3"
          :maxlength="MAX_DESCRIPTION"
          show-word-limit
          placeholder="请输入描述"
        />
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
import { addProjectType, getAllProjectType, updateProjectType } from '@/api/projectType';

const MAX_NAME = 128;
const MAX_STANDARDS = 128;
const MAX_QUANTITY = 128;
const MAX_DESCRIPTION = 512;

/**
 * 契约 2.4 的按类型显示规则：
 * 坝 = 名称 + 规格(米)；路 = 名称 + 规格(路宽,米) + 数量(路长,米)；桥 = 名称 + 规格(桥宽,米) + 数量(桥长,米)；
 * 井/塘/绿化/电/智能/其他 = 仅名称。
 * 字典里的 key 只有工程类型码是稳定的，nameLabel 只是输入框标题，未知类型自动退回「仅名称」。
 */
const NAME_LABELS = {
  DAM: '坝名',
  ROAD: '路名',
  BRIDGE: '桥名',
  WELL: '井名',
  POOL: '塘名',
  GREEN: '绿化名',
};

const SIZE_FIELDS = {
  DAM: {
    standards: { label: '合同规格', placeholder: '请输入规格', unit: '米', number: false },
  },
  ROAD: {
    standards: { label: '合同规格', placeholder: '请输入路宽', unit: '米', number: true },
    quantity: { label: '数量', placeholder: '请输入路长', unit: '米', number: true },
  },
  BRIDGE: {
    standards: { label: '合同规格', placeholder: '请输入桥宽', unit: '米', number: true },
    quantity: { label: '数量', placeholder: '请输入桥长', unit: '米', number: true },
  },
};

const props = defineProps({
  /** null 表示新增；否则为待编辑的工程量行 */
  record: {
    type: Object,
    default: null,
  },
  /** 所在的标段 / 项目区：{projectId, tenderId, projectName, tenderName} */
  parent: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['saved']);

const visible = defineModel({ type: Boolean, default: false });

const formRef = ref();
const submitting = ref(false);
const typesLoading = ref(false);
const typeOptions = ref([]);

const form = reactive({
  type: '',
  name: '',
  standards: '',
  quantity: '',
  contractPrice: null,
  description: '',
});

const isEdit = computed(() => !!(props.record && props.record.id !== undefined && props.record.id !== null));

const schema = computed(() => {
  const size = SIZE_FIELDS[form.type] || {};
  return {
    nameLabel: NAME_LABELS[form.type] || '名称',
    standards: size.standards || null,
    quantity: size.quantity || null,
  };
});

const rules = computed(() => {
  const fieldRules = {
    type: [{ required: true, message: '请选择工程种类', trigger: 'change' }],
    name: [
      { required: true, message: `请输入${schema.value.nameLabel}`, trigger: 'blur' },
      { max: MAX_NAME, message: `名称不超过 ${MAX_NAME} 个字`, trigger: 'blur' },
    ],
    description: [{ max: MAX_DESCRIPTION, message: `描述不超过 ${MAX_DESCRIPTION} 个字`, trigger: 'blur' }],
  };
  if (schema.value.standards) {
    fieldRules.standards = [{ required: true, message: `请输入${schema.value.standards.placeholder}`, trigger: 'blur' }];
    if (schema.value.standards.number) {
      fieldRules.standards.push({ pattern: /^\d+(\.\d+)?$/, message: '请输入数字（米）', trigger: 'blur' });
    }
  }
  if (schema.value.quantity) {
    fieldRules.quantity = [{ required: true, message: `请输入${schema.value.quantity.placeholder}`, trigger: 'blur' }];
    if (schema.value.quantity.number) {
      fieldRules.quantity.push({ pattern: /^\d+(\.\d+)?$/, message: '请输入数字（米）', trigger: 'blur' });
    }
  }
  return fieldRules;
});

/** 工程类型码 -> 中文名来自 /api/projectType/getAllProjectType，不在前端硬编码 */
async function loadTypeOptions () {
  if (typeOptions.value.length) return;
  typesLoading.value = true;
  try {
    const res = await getAllProjectType();
    const map = (res && res.data) || {};
    typeOptions.value = Object.keys(map).map((code) => ({ code, label: map[code] }));
  } catch (error) {
    // 拦截器已提示
  } finally {
    typesLoading.value = false;
  }
}

watch(visible, (opened) => {
  if (!opened) return;
  loadTypeOptions();
  const source = props.record || {};
  form.type = source.type || '';
  form.name = source.name || '';
  form.standards = source.standards || '';
  form.quantity = source.quantity || '';
  form.contractPrice = source.contractPrice === null || source.contractPrice === undefined || source.contractPrice === ''
    ? null
    : Number(source.contractPrice);
  form.description = source.description || '';
  formRef.value && formRef.value.clearValidate();
});

// 切换类型时把不再显示的字段清掉，避免把上一次填写的规格/数量带进新类型
watch(() => form.type, () => {
  if (!schema.value.standards) form.standards = '';
  if (!schema.value.quantity) form.quantity = '';
  formRef.value && formRef.value.clearValidate(['standards', 'quantity']);
});

function handleClosed () {
  submitting.value = false;
  formRef.value && formRef.value.resetFields();
}

function orNull (value) {
  return value === '' || value === undefined || value === null ? null : value;
}

async function handleSubmit () {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  // 契约 2.4：父级 id 由所在节点决定。legacy 编辑时读 typeObj.tendersId / projectId，
  // 而 getBackendProjectIndex 返回的工程量行里根本没有这两个字段，更新会带 undefined。
  const tenderId = (isEdit.value && props.record.tenderId) || props.parent.tenderId;
  const projectId = (isEdit.value && props.record.projectId) || props.parent.projectId;
  if (tenderId === undefined || projectId === undefined) {
    ElMessage.warning('缺少所属标段，请重新选择');
    return;
  }

  const payload = {
    type: form.type,
    name: form.name,
    // 类型不需要的字段传 null，而不是把隐藏输入框的残值提交上去
    standards: schema.value.standards ? orNull(form.standards) : null,
    quantity: schema.value.quantity ? orNull(form.quantity) : null,
    contractPrice: form.contractPrice === null || form.contractPrice === undefined ? null : form.contractPrice,
    description: orNull(form.description),
    tenderId,
    projectId,
  };
  if (isEdit.value) payload.id = props.record.id;

  submitting.value = true;
  try {
    // legacy 编辑用 FormData 把整行字段混进去提交，契约 2.4 明确只收表单自身字段 -> 走 JSON
    if (isEdit.value) {
      await updateProjectType(payload);
      ElMessage.success('工程量更新成功');
    } else {
      await addProjectType(payload);
      ElMessage.success('工程量新增成功');
    }
    visible.value = false;
    emit('saved', { mode: isEdit.value ? 'update' : 'add', tenderId, projectId });
  } catch (error) {
    // 拦截器已提示
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
/* 弹窗内容通过 slot 渲染，自带本组件的 scope id；弹窗骨架（.el-dialog__body）不做覆盖 */
.type-dialog_breadcrumb {
  margin-bottom: 12px;
  padding: 6px 10px;
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
}

.type-dialog_inline {
  display: flex;
  align-items: center;
  width: 100%;
}

.type-dialog_inline_input {
  max-width: 220px;
}

.type-dialog_unit {
  margin-left: 8px;
  color: #909399;
}

.type-dialog_price {
  width: 220px;

  :deep(.el-input__inner) {
    text-align: left;
  }
}
</style>
