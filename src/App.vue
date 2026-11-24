<template>
  <router-view />
</template>

<script setup>
// 布局的显示/隐藏交给路由结构决定（登录页不在 layout 路由下），
// 不再像 legacy 那样在 App.vue 里用 $store.state.userInfo 条件渲染菜单。
</script>
