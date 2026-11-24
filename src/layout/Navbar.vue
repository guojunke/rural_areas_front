<template>
  <div class="navbar">
    <div class="navbar_left">
      <el-icon class="navbar_toggle" title="展开/收起菜单" @click="emit('toggle')">
        <component :is="collapsed ? Expand : Fold" />
      </el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>智慧高标</el-breadcrumb-item>
        <!-- 页面标题取自路由 meta，替代 legacy 的 $store.state.currentRouterName -->
        <el-breadcrumb-item>{{ route.meta.title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="navbar_right">
      <el-icon class="navbar_user_icon"><UserFilled /></el-icon>
      <span class="navbar_username">{{ userStore.username || '未登录' }}</span>
      <el-button link type="primary" @click="handleLogout">退出</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { Expand, Fold, UserFilled } from '@element-plus/icons-vue';
import { useUserStore } from '@/store/user';

defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['toggle']);

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

function handleLogout () {
  userStore.logout();
  router.replace('/login');
}
</script>

<style lang="scss" scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 16px;
}

.navbar_left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.navbar_toggle {
  margin-right: 12px;
  font-size: 20px;
  color: #606266;
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }
}

.navbar_right {
  display: flex;
  align-items: center;
  flex: none;
}

.navbar_user_icon {
  font-size: 18px;
  color: #606266;
}

.navbar_username {
  margin: 0 12px 0 6px;
  color: #303133;
}
</style>
