<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h1>仪表板</h1>
      <a-button @click="refreshData" :loading="dashboardStore.loading">
        <template #icon>
          <icon-refresh />
        </template>
        刷新
      </a-button>
    </div>

    <div v-if="!connectionStore.currentConnection" class="no-connection">
      <a-empty description="请先选择一个连接" />
    </div>

    <div v-else>
      <a-row :gutter="24">
        <a-col :span="24">
          <a-card title="集群健康状态" :loading="dashboardStore.loading">
            <div v-if="clusterHealth" class="cluster-health">
              <a-descriptions :column="2" bordered>
                <a-descriptions-item label="集群名称">
                  {{ clusterHealth.cluster_name }}
                </a-descriptions-item>
                <a-descriptions-item label="状态">
                  <a-tag :color="getHealthColor(clusterHealth.status)">
                    {{ clusterHealth.status.toUpperCase() }}
                  </a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="节点数">
                  {{ clusterHealth.number_of_nodes }}
                </a-descriptions-item>
                <a-descriptions-item label="数据节点数">
                  {{ clusterHealth.number_of_data_nodes }}
                </a-descriptions-item>
                <a-descriptions-item label="活动主分片">
                  {{ clusterHealth.active_primary_shards }}
                </a-descriptions-item>
                <a-descriptions-item label="活动分片">
                  {{ clusterHealth.active_shards }}
                </a-descriptions-item>
                <a-descriptions-item label="重定位分片">
                  {{ clusterHealth.relocating_shards }}
                </a-descriptions-item>
                <a-descriptions-item label="初始化分片">
                  {{ clusterHealth.initializing_shards }}
                </a-descriptions-item>
                <a-descriptions-item label="未分配分片">
                  <span :class="{ 'text-danger': clusterHealth.unassigned_shards > 0 }">
                    {{ clusterHealth.unassigned_shards }}
                  </span>
                </a-descriptions-item>
                <a-descriptions-item label="超时">
                  {{ clusterHealth.timed_out ? '是' : '否' }}
                </a-descriptions-item>
              </a-descriptions>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useConnectionStore } from '../stores/connection'
import { useDashboardStore } from '../stores/dashboard'
import { IconRefresh } from '@arco-design/web-vue/es/icon'

const connectionStore = useConnectionStore()
const dashboardStore = useDashboardStore()

const clusterHealth = computed(() => dashboardStore.clusterHealth)

onMounted(() => {
  if (connectionStore.currentConnection) {
    refreshData()
  }
})

watch(
  () => connectionStore.currentConnection,
  (newConnection) => {
    if (newConnection) {
      refreshData()
    }
  }
)

const refreshData = async () => {
  if (!connectionStore.currentConnection) return
  
  await dashboardStore.fetchClusterHealth(connectionStore.currentConnection.id)
}

const getHealthColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'green':
      return 'green'
    case 'yellow':
      return 'orange' 
    case 'red':
      return 'red'
    default:
      return 'gray'
  }
}
</script>

<style scoped>
.dashboard-page {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.no-connection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.cluster-health {
  margin-top: 16px;
}

.text-danger {
  color: #f53f3f;
  font-weight: 600;
}
</style>