<template>
  <div class="login">
    <el-card class="login_card" shadow="always">
      <h1 class="login_title">智慧高标管理系统</h1>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="账号" prop="mobile">
          <el-input
            v-model.trim="form.mobile"
            :maxlength="11"
            placeholder="请输入手机号"
            :prefix-icon="User"
            clearable
            @focus="clearError"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleSubmit"
            @focus="clearError"
          />
        </el-form-item>

        <p v-if="errorMessage" class="login_error">{{ errorMessage }}</p>

        <el-button
          class="login_submit"
          type="primary"
          size="large"
          :loading="loading"
          @click="handleSubmit"
        >
          登录
        </el-button>
      </el-form>

      <!-- legacy 的「记住密码」把明文密码写进 localStorage，且 created() 里把
           getItem 误写成 setItem，自动填充从来就没生效过。契约 1.3 要求不再在
           客户端存密码，因此该功能直接下线，不做不安全的重现。 -->
      <p class="login_tip">登录状态仅保存在当前浏览器会话中，关闭标签页即失效。</p>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Lock, User } from '@element-plus/icons-vue';
import { useUserStore } from '@/store/user';

const DEFAULT_HOME = '/EngNumManage';

const router = useRouter();
const userStore = useUserStore();

const formRef = ref();
const loading = ref(false);
const errorMessage = ref('');
const form = reactive({
  mobile: '',
  password: '',
});

const rules = {
  mobile: [{ required: true, message: '请输入账号（手机号）', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

function clearError () {
  errorMessage.value = '';
}

async function handleSubmit () {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  errorMessage.value = '';
  try {
    await userStore.login({ mobile: form.mobile, password: form.password });
    // token 与 userInfo 已由 store 写入 sessionStorage，request.js 之后自动带头
    router.replace(DEFAULT_HOME);
  } catch (error) {
    // 失败信封（errorCode !== '0'）由响应拦截器 reject 出来，这里取服务端的 message。
    // 拦截器已经弹过一次 ElMessage，页面内再显示一行，避免登录卡片上「什么都没发生」。
    errorMessage.value = (error && error.message) || '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #2b3a4a 0%, #409eff 100%);
}

.login_card {
  width: 380px;
  padding: 8px 16px 16px;
  border-radius: 8px;
}

.login_title {
  margin: 4px 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  text-align: center;
}

.login_error {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-color-danger);
}

.login_submit {
  width: 100%;
}

.login_tip {
  margin: 16px 0 0;
  font-size: 12px;
  color: #909399;
  text-align: center;
}
</style>
