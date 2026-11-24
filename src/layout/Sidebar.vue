<template>
  <div class="sidebar">
    <div class="sidebar_title" :class="{ 'is-collapsed': collapsed }">
      <el-icon class="sidebar_title_icon"><Grid /></el-icon>
      <span v-if="!collapsed" class="sidebar_title_text ellipsis">智慧高标管理系统</span>
    </div>

    <!-- default-active 绑定当前路由 path。legacy 是用「菜单标题字符串」判断高亮，
         标题改一个字就失去高亮，这里改成路由驱动 -->
    <el-menu
      class="sidebar_menu"
      :default-active="route.path"
      :collapse="collapsed"
      :collapse-transition="false"
      router
    >
      <el-menu-item v-for="item in menuRoutes" :key="item.path" :index="item.path">
        <el-icon><component :is="iconMap[item.icon]" /></el-icon>
        <template #title>{{ item.title }}</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import {
  Bell,
  Folder,
  Grid,
  TrendCharts,
  Upload,
  User,
  VideoCamera,
} from '@element-plus/icons-vue';
import { menuRoutes } from '@/router/menu';

defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

const route = useRoute();

// menu.js 的 meta.icon 存名字，这里映射成组件，避免整包引入图标库
const iconMap = {
  Grid,
  TrendCharts,
  Upload,
  Bell,
  VideoCamera,
  Folder,
  User,
};
</script>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  // Element Plus 菜单配色用 CSS 变量（旧的 background-color / text-color props 已废弃）
  --el-menu-bg-color: #263445;
  --el-menu-text-color: #bfcbd9;
  --el-menu-active-color: #ffd04b;
  --el-menu-hover-bg-color: #1f2d3d;
}

.sidebar_title {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  overflow: hidden;
  color: #fff;
  background: #2b3a4a;

  &.is-collapsed {
    justify-content: center;
    padding: 0;
  }
}

.sidebar_title_icon {
  flex: none;
  font-size: 20px;
}

.sidebar_title_text {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.sidebar_menu {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  border-right: none;
}
</style>
