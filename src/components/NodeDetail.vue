<template>
  <div class="node-detail">
    <a-tabs default-active-key="overview" :animation="false">
      <a-tab-pane key="overview" title="概览">
        <div class="overview-content">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-card title="基本信息" size="small">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">节点ID:</span>
                    <span class="value">{{ nodeInfo.id }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">节点名称:</span>
                    <span class="value">{{ nodeInfo.name }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">主机地址:</span>
                    <span class="value">{{ nodeInfo.host }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">IP地址:</span>
                    <span class="value">{{ nodeInfo.ip }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">传输地址:</span>
                    <span class="value">{{ nodeInfo.transport_address }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">版本:</span>
                    <span class="value">{{ nodeInfo.version }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">构建类型:</span>
                    <span class="value">{{ nodeInfo.build_type }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">构建哈希:</span>
                    <span class="value">{{ nodeInfo.build_hash?.substring(0, 8) }}</span>
                  </div>
                </div>
              </a-card>
            </a-col>
            
            <a-col :span="12">
              <a-card title="角色信息" size="small">
                <div class="roles-container">
                  <a-tag
                    v-for="role in nodeInfo.roles"
                    :key="role"
                    color="blue"
                    class="role-tag"
                  >
                    {{ getNodeRoleText([role]) }}
                  </a-tag>
                </div>
              </a-card>
            </a-col>
          </a-row>

          <a-row :gutter="16" style="margin-top: 16px;" v-if="nodeStats">
            <a-col :span="6">
              <a-card title="CPU 使用率" size="small">
                <a-progress
                  type="circle"
                  :percent="nodeStats.os?.cpu?.percent || 0"
                  :width="80"
                  :color="getMetricColor(nodeStats.os?.cpu?.percent || 0)"
                />
              </a-card>
            </a-col>
            
            <a-col :span="6">
              <a-card title="内存使用率" size="small">
                <a-progress
                  type="circle"
                  :percent="nodeStats.os?.mem?.used_percent || 0"
                  :width="80"
                  :color="getMetricColor(nodeStats.os?.mem?.used_percent || 0)"
                />
              </a-card>
            </a-col>
            
            <a-col :span="6">
              <a-card title="JVM 堆使用率" size="small">
                <a-progress
                  type="circle"
                  :percent="nodeStats.jvm?.mem?.heap_used_percent || 0"
                  :width="80"
                  :color="getMetricColor(nodeStats.jvm?.mem?.heap_used_percent || 0)"
                />
              </a-card>
            </a-col>
            
            <a-col :span="6">
              <a-card title="磁盘使用率" size="small">
                <a-progress
                  type="circle"
                  :percent="diskUsagePercent"
                  :width="80"
                  :color="getMetricColor(diskUsagePercent)"
                />
              </a-card>
            </a-col>
          </a-row>
        </div>
      </a-tab-pane>

      <a-tab-pane key="system" title="系统资源">
        <div v-if="nodeStats" class="system-content">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-card title="操作系统" size="small">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">CPU 使用率:</span>
                    <span class="value">{{ nodeStats.os?.cpu?.percent || 0 }}%</span>
                  </div>
                  <div class="info-item">
                    <span class="label">内存总量:</span>
                    <span class="value">{{ formatBytes(nodeStats.os?.mem?.total_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">内存使用:</span>
                    <span class="value">{{ formatBytes(nodeStats.os?.mem?.used_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">内存空闲:</span>
                    <span class="value">{{ formatBytes(nodeStats.os?.mem?.free_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">交换分区总量:</span>
                    <span class="value">{{ formatBytes(nodeStats.os?.swap?.total_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">交换分区使用:</span>
                    <span class="value">{{ formatBytes(nodeStats.os?.swap?.used_in_bytes || 0) }}</span>
                  </div>
                </div>
              </a-card>
            </a-col>
            
            <a-col :span="12">
              <a-card title="磁盘存储" size="small">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">总容量:</span>
                    <span class="value">{{ formatBytes(nodeStats.fs?.total?.total_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">可用空间:</span>
                    <span class="value">{{ formatBytes(nodeStats.fs?.total?.available_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">空闲空间:</span>
                    <span class="value">{{ formatBytes(nodeStats.fs?.total?.free_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">使用率:</span>
                    <span class="value">{{ diskUsagePercent.toFixed(1) }}%</span>
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>
      </a-tab-pane>

      <a-tab-pane key="jvm" title="JVM 信息">
        <div v-if="nodeStats" class="jvm-content">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-card title="JVM 内存" size="small">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">堆内存最大:</span>
                    <span class="value">{{ formatBytes(nodeStats.jvm?.mem?.heap_max_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">堆内存已用:</span>
                    <span class="value">{{ formatBytes(nodeStats.jvm?.mem?.heap_used_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">堆内存使用率:</span>
                    <span class="value">{{ nodeStats.jvm?.mem?.heap_used_percent || 0 }}%</span>
                  </div>
                  <div class="info-item">
                    <span class="label">堆内存提交:</span>
                    <span class="value">{{ formatBytes(nodeStats.jvm?.mem?.heap_committed_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">非堆内存使用:</span>
                    <span class="value">{{ formatBytes(nodeStats.jvm?.mem?.non_heap_used_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">非堆内存提交:</span>
                    <span class="value">{{ formatBytes(nodeStats.jvm?.mem?.non_heap_committed_in_bytes || 0) }}</span>
                  </div>
                </div>
              </a-card>
            </a-col>
            
            <a-col :span="12">
              <a-card title="JVM 运行时" size="small">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">运行时间:</span>
                    <span class="value">{{ formatDuration(nodeStats.jvm?.uptime_in_millis || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">线程数量:</span>
                    <span class="value">{{ nodeStats.jvm?.threads?.count || 0 }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">峰值线程数:</span>
                    <span class="value">{{ nodeStats.jvm?.threads?.peak_count || 0 }}</span>
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>
      </a-tab-pane>

      <a-tab-pane key="indices" title="索引统计">
        <div v-if="nodeStats" class="indices-content">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-card title="文档统计" size="small">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">文档总数:</span>
                    <span class="value">{{ (nodeStats.indices?.docs?.count || 0).toLocaleString() }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">已删除文档:</span>
                    <span class="value">{{ (nodeStats.indices?.docs?.deleted || 0).toLocaleString() }}</span>
                  </div>
                </div>
              </a-card>
            </a-col>
            
            <a-col :span="8">
              <a-card title="存储统计" size="small">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">存储大小:</span>
                    <span class="value">{{ formatBytes(nodeStats.indices?.store?.size_in_bytes || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">保留大小:</span>
                    <span class="value">{{ formatBytes(nodeStats.indices?.store?.reserved_in_bytes || 0) }}</span>
                  </div>
                </div>
              </a-card>
            </a-col>
            
            <a-col :span="8">
              <a-card title="搜索统计" size="small">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">查询总数:</span>
                    <span class="value">{{ (nodeStats.indices?.search?.query_total || 0).toLocaleString() }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">查询时间:</span>
                    <span class="value">{{ formatDuration(nodeStats.indices?.search?.query_time_in_millis || 0) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">当前查询:</span>
                    <span class="value">{{ nodeStats.indices?.search?.query_current || 0 }}</span>
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNodeStore } from '../stores/node'
import type { NodeInfo, NodeStats } from '../types'

interface Props {
  nodeInfo: NodeInfo
  nodeStats?: NodeStats
}

const props = defineProps<Props>()
const nodeStore = useNodeStore()

// 计算磁盘使用率
const diskUsagePercent = computed(() => {
  if (!props.nodeStats?.fs?.total) return 0
  const total = props.nodeStats.fs.total.total_in_bytes
  const available = props.nodeStats.fs.total.available_in_bytes
  return ((total - available) / total) * 100
})

// 工具函数
const formatBytes = nodeStore.formatBytes
const formatDuration = nodeStore.formatDuration
const getNodeRoleText = nodeStore.getNodeRoleText

const getMetricColor = (value: number) => {
  if (value > 90) return '#f5222d'
  if (value > 70) return '#faad14'
  return '#52c41a'
}
</script>

<style scoped>
.node-detail {
  height: 100%;
}

.overview-content,
.system-content,
.jvm-content,
.indices-content {
  padding: 16px 0;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border-3);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: var(--color-text-2);
  font-size: 13px;
}

.value {
  color: var(--color-text-1);
  font-weight: 500;
  font-size: 13px;
}

.roles-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-tag {
  margin-bottom: 8px;
}
</style>