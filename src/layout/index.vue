<template>
  <el-container class="layout">
    <el-aside class="layout_aside" :width="asideWidth">
      <Sidebar :collapsed="isCollapse" />
    </el-aside>
    <el-container class="layout_body">
      <el-header class="layout_header" height="56px">
        <Navbar :collapsed="isCollapse" @toggle="toggleCollapse" />
      </el-header>
      <el-main class="layout_main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue';
import Navbar from './Navbar.vue';
import Sidebar from './Sidebar.vue';

const isCollapse = ref(false);
const asideWidth = computed(() =>
  isCollapse.value ? 'var(--app-sidebar-width-collapsed)' : 'var(--app-sidebar-width)'
);

function toggleCollapse () {
  isCollapse.value = !isCollapse.value;
}
</script>

<style lang="scss" scoped>
.layout {
  height: 100%;
  // 后台最低适配宽度：窄于此宽度时出现横向滚动条，不做移动端折叠适配
  min-width: 1200px;
}

.layout_aside {
  overflow: hidden;
  background: #263445;
  transition: width 0.2s ease;
}

.layout_body {
  overflow: hidden;
}

.layout_header {
  padding: 0;
  border-bottom: 1px solid #dcdfe6;
  background: #fff;
}

.layout_main {
  padding: 0;
  overflow: auto;
  background: var(--app-content-bg);
}
</style>
