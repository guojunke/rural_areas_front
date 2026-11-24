<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="rate_head">
          <span>{{ route.meta.title }}</span>
          <span class="rate_head_tip">
            日进度报告为移动端写入的只读数据；进度填报的字段项由服务端字典
            <code>/api/progress/getProcessItems</code> 下发。
          </span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="日进度报告" name="daily">
          <DailyReport v-if="activeTab === 'daily'" />
        </el-tab-pane>
        <el-tab-pane label="进度填报" name="progress">
          <ProgressEntry v-if="activeTab === 'progress'" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import DailyReport from './DailyReport.vue';
import ProgressEntry from './ProgressEntry.vue';

const route = useRoute();
const activeTab = ref('daily');
</script>

<style lang="scss" scoped>
.rate_head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.rate_head_tip {
  font-size: 12px;
  font-weight: 400;
  color: #909399;

  code {
    padding: 1px 4px;
    font-size: 12px;
    background: #f2f3f5;
    border-radius: 2px;
  }
}
</style>
