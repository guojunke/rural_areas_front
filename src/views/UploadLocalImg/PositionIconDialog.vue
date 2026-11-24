<template>
  <el-dialog
    :model-value="visible"
    title="上传定位图片"
    width="520px"
    append-to-body
    @update:model-value="setVisible"
    @closed="resetFiles"
  >
    <div v-if="context" class="pos_dialog">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="项目区">{{ context.projectName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="标段">{{ context.tenderName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="工程量">{{ context.name || '--' }}</el-descriptions-item>
        <el-descriptions-item label="工程类型">{{ context.typeName || '--' }}</el-descriptions-item>
      </el-descriptions>

      <el-upload
        class="pos_upload"
        drag
        :auto-upload="false"
        :multiple="true"
        accept="image/*"
        v-model:file-list="fileList"
        :on-change="handleFileChange"
        :limit="9"
        :on-exceed="handleExceed"
      >
        <el-icon class="pos_upload_icon"><UploadFilled /></el-icon>
        <div class="pos_upload_text">
          将图片拖到此处，或<em>点击选择</em>
          <p class="pos_upload_tip">可多选；文件以契约 2.4 的同名多部件 <code>files</code> 提交，由 api 层组装。</p>
        </div>
      </el-upload>
    </div>

    <template #footer>
      <el-button @click="setVisible(false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定上传</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { uploadPositionIcon } from '@/api/projectType';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  // {projectId, tenderId, proTypeId, typeName, type, ...}，proTypeId 即工程量 id
  context: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:visible', 'uploaded']);

const fileList = ref([]);
const submitting = ref(false);

function setVisible (value) {
  emit('update:visible', value);
}

function resetFiles () {
  fileList.value = [];
}

const IMAGE_EXT = /\.(png|jpe?g|gif|bmp|webp|svg)$/i;

function isImageFile (raw) {
  if (!raw) return false;
  if (raw.type) return raw.type.startsWith('image/');
  return IMAGE_EXT.test(raw.name || '');
}

/** auto-upload 关闭，选中的文件只进列表不发请求，类型校验只能放在 on-change */
function handleFileChange (file, files) {
  if (isImageFile(file.raw)) return;
  fileList.value = files.filter((item) => item.uid !== file.uid);
  ElMessage.warning(`${file.name || '所选文件'} 不是图片，已忽略`);
}

function handleExceed () {
  ElMessage.warning('单次最多上传 9 张图片');
}

async function handleSubmit () {
  const ctx = props.context;
  // 上传前置校验：定位图片必须挂在具体工程量上（契约 2.4 的 proTypeId）
  if (!ctx || !ctx.proTypeId) {
    ElMessage.warning('请先选择要上传定位图片的工程量');
    return;
  }
  const files = fileList.value.map((item) => item.raw).filter(Boolean);
  if (!files.length) {
    ElMessage.warning('请选择要上传的图片');
    return;
  }
  submitting.value = true;
  try {
    await uploadPositionIcon({
      projectId: ctx.projectId,
      tenderId: ctx.tenderId,
      proTypeId: ctx.proTypeId,
      typeName: ctx.typeName,
      type: ctx.type,
      files,
    });
    ElMessage.success('定位图片上传成功');
    emit('uploaded');
    setVisible(false);
  } catch (e) {
    // 失败提示由 utils/request.js 拦截器统一弹出，弹窗保留便于重试
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.pos_dialog {
  min-height: 120px;
}

.pos_upload {
  margin-top: 14px;
}

.pos_upload_icon {
  font-size: 42px;
  color: #c0c4cc;
}

.pos_upload_text {
  font-size: 13px;
  color: #606266;

  em {
    color: var(--el-color-primary);
    font-style: normal;
  }
}

.pos_upload_tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;

  code {
    padding: 1px 4px;
    background: #f2f3f5;
    border-radius: 2px;
  }
}
</style>
