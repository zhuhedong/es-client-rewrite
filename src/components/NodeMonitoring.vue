<template>
  <div class="node-monitoring">
    <div class="monitoring-header">
      <a-row :gutter="16">
        <a-col :span="18">
          <a-space>
            <a-button @click="refreshNodes" :loading="loading" type="primary">
              <template #icon><icon-refresh /></template>
              刷新
            </a-button>
            <a-switch
              v-model:model-value="autoRefresh"
              @change="handleAutoRefreshChange"
            >
              <template #checked>自动刷新</template>
              <template #unchecked>手动刷新</template>
            </a-switch>
            <a-select
              v-model:model-value="refreshInterval"
              :disabled="!autoRefresh"
              style="width: 120px"
              @change="updateRefreshInterval"
            >
              <a-option :value="1000">1秒</a-option>
              <a-option :value="5000">5秒</a-option>
              <a-option :value="10000">10秒</a-option>
              <a-option :value="30000">30秒</a-option>
            </a-select>
          </a-space>
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="节点总数"
            :value="nodesInfo.length"
            :precision="0"
          />
        </a-col>
      </a-row>
    </div>

    <a-divider />

    <div class="nodes-grid">
      <a-row :gutter="[16, 16]">
        <a-col
          v-for="node in combinedNodesData"
          :key="node.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <a-card
            :title="node.name"
            size="small"
            hoverable
            @click="selectNode(node.id)"
            :class="{ 'selected-node': selectedNodeId === node.id }"
          >
            <div class="node-overview">
              <div class="node-status">
                <a-tag :color="getNodeStatusColor(node)">
                  {{ getNodeStatusText(node) }}
                </a-tag>
              </div>
              
              <div class="node-roles">
                <a-tag
                  v-for="role in node.roles"
                  :key="role"
                  size="small"
                  color="blue"
                >
                  {{ getNodeRoleText([role]) }}
                </a-tag>
              </div>

              <div class="node-metrics" v-if="node.stats">
                <div class="metric-item">
                  <div class="metric-label">CPU 使用率</div>
                  <a-progress
                    :percent="node.metrics?.cpuUsage || 0"
                    size="small"
                    :color="getMetricColor(node.metrics?.cpuUsage || 0)"
                  />
                </div>

                <div class="metric-item">
                  <div class="metric-label">内存使用率</div>
                  <a-progress
                    :percent="node.metrics?.memoryUsage || 0"
                    size="small"
                    :color="getMetricColor(node.metrics?.memoryUsage || 0)"
                  />
                </div>

                <div class="metric-item">
                  <div class="metric-label">JVM 堆使用率</div>
                  <a-progress
                    :percent="node.metrics?.heapUsage || 0"
                    size="small"
                    :color="getMetricColor(node.metrics?.heapUsage || 0)"
                  />
                </div>

                <div class="metric-item">
                  <div class="metric-label">磁盘使用率</div>
                  <a-progress
                    :percent="node.metrics?.diskUsage || 0"
                    size="small"
                    :color="getMetricColor(node.metrics?.diskUsage || 0)"
                  />
                </div>
              </div>

              <div class="node-basic-info">
                <div class="info-item">
                  <span class="info-label">版本:</span>
                  <span class="info-value">{{ node.version }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">地址:</span>
                  <span class="info-value">{{ node.host }}:{{ extractPort(node.transport_address) }}</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 节点详情抽屉 -->
    <a-drawer
      v-model:visible="showNodeDetail"
      title="节点详细信息"
      width="60%"
      placement="right"
    >
      <node-detail
        v-if="selectedNodeData"
        :node-info="selectedNodeData.info"
        :node-stats="selectedNodeData.stats"
      />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useNodeStore } from '../stores/node'
import { useConnectionStore } from '../stores/connection'
import { Message } from '@arco-design/web-vue'
import { IconRefresh } from '@arco-design/web-vue/es/icon'
import NodeDetail from './NodeDetail.vue'

const nodeStore = useNodeStore()
const connectionStore = useConnectionStore()

const showNodeDetail = ref(false)

const loading = computed(() => nodeStore.loading)
const nodesInfo = computed(() => nodeStore.nodesInfo)
const nodesStats = computed(() => nodeStore.nodesStats)
const selectedNodeId = computed({
  get: () => nodeStore.selectedNodeId,
  set: (value) => nodeStore.selectedNodeId = value
})
const autoRefresh = computed({
  get: () => nodeStore.autoRefresh,
  set: (value) => {
    if (value) {
      startAutoRefresh()
    } else {
      nodeStore.stopAutoRefresh()
    }
  }
})
const refreshInterval = computed({
  get: () => nodeStore.refreshInterval,
  set: (value) => nodeStore.refreshInterval = value
})

// 合并节点信息和统计数据
const combinedNodesData = computed(() => {
  return nodesInfo.value.map(node => {
    const stats = nodesStats.value.find(s => s.id === node.id)
    const metrics = stats ? nodeStore.calculateNodeMetrics(stats) : null
    
    return {
      ...node,
      stats,
      metrics
    }
  })
})

// 选中节点的详细数据
const selectedNodeData = computed(() => {
  if (!selectedNodeId.value) return null
  
  const info = nodesInfo.value.find(n => n.id === selectedNodeId.value)
  const stats = nodesStats.value.find(s => s.id === selectedNodeId.value)
  
  return info ? { info, stats } : null
})

// 刷新节点数据
const refreshNodes = async () => {
  if (!connectionStore.currentConnection) {
    Message.error('请先选择连接')
    return
  }
  
  await nodeStore.refreshAllNodes(connectionStore.currentConnection.id)
}

// 选择节点
const selectNode = (nodeId: string) => {
  selectedNodeId.value = nodeId
  showNodeDetail.value = true
}

// 处理自动刷新切换
const handleAutoRefreshChange = (value: string | number | boolean) => {
  const boolValue = Boolean(value)
  if (boolValue) {
    startAutoRefresh()
  } else {
    nodeStore.stopAutoRefresh()
  }
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (!connectionStore.currentConnection) return
  nodeStore.startAutoRefresh(connectionStore.currentConnection.id)
}

// 更新刷新间隔
const updateRefreshInterval = () => {
  if (autoRefresh.value && connectionStore.currentConnection) {
    nodeStore.stopAutoRefresh()
    nodeStore.startAutoRefresh(connectionStore.currentConnection.id)
  }
}

// 获取节点状态颜色
const getNodeStatusColor = (node: any) => {
  // 根据各种指标综合判断节点状态
  if (!node.metrics) return 'default'
  
  const { cpuUsage, memoryUsage, heapUsage } = node.metrics
  const maxUsage = Math.max(cpuUsage, memoryUsage, heapUsage)
  
  if (maxUsage > 90) return 'red'
  if (maxUsage > 70) return 'orange'
  return 'green'
}

// 获取节点状态文本
const getNodeStatusText = (node: any) => {
  if (!node.metrics) return '未知'
  
  const { cpuUsage, memoryUsage, heapUsage } = node.metrics
  const maxUsage = Math.max(cpuUsage, memoryUsage, heapUsage)
  
  if (maxUsage > 90) return '高负载'
  if (maxUsage > 70) return '中等负载'
  return '正常'
}

// 获取指标颜色
const getMetricColor = (value: number) => {
  if (value > 90) return '#f5222d'
  if (value > 70) return '#faad14'
  return '#52c41a'
}

// 提取端口号
const extractPort = (address: string) => {
  const match = address.match(/:(\d+)$/)
  return match ? match[1] : '9300'
}

// 获取节点角色文本
const getNodeRoleText = nodeStore.getNodeRoleText

// 监听当前连接变化
watch(() => connectionStore.currentConnection, async (connection) => {
  if (connection) {
    await refreshNodes()
  } else {
    nodeStore.stopAutoRefresh()
  }
}, { immediate: true })

// 组件卸载时停止自动刷新
onUnmounted(() => {
  nodeStore.stopAutoRefresh()
})
</script>

<style scoped>
.node-monitoring {
  height: 100%;
  padding: 16px;
}

.monitoring-header {
  margin-bottom: 16px;
}

.nodes-grid {
  height: calc(100% - 120px);
  overflow-y: auto;
}

.selected-node {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-6), 0.2);
}

.node-overview {
  font-size: 12px;
}

.node-status {
  margin-bottom: 8px;
}

.node-roles {
  margin-bottom: 12px;
}

.node-roles .arco-tag {
  margin-bottom: 4px;
}

.node-metrics {
  margin-bottom: 12px;
}

.metric-item {
  margin-bottom: 8px;
}

.metric-label {
  font-size: 11px;
  color: var(--color-text-2);
  margin-bottom: 4px;
}

.node-basic-info {
  margin-top: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.info-label {
  color: var(--color-text-2);
}

.info-value {
  color: var(--color-text-1);
  font-weight: 500;
}
</style>