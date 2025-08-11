<template>
  <div class="performance-analysis">
    <div class="analysis-header">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-statistic
            title="总查询数"
            :value="stats.totalQueries"
            :precision="0"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="平均执行时间"
            :value="stats.avgExecutionTime"
            suffix="ms"
            :precision="0"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="慢查询数"
            :value="stats.slowQueries"
            :precision="0"
            :value-style="{ color: stats.slowQueries > 0 ? '#f5222d' : '#52c41a' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="平均结果数"
            :value="stats.avgResultCount"
            :precision="0"
          />
        </a-col>
      </a-row>
      
      <div style="margin-top: 16px;">
        <a-space>
          <a-input-number
            v-model:model-value="slowQueryThreshold"
            :min="100"
            :max="10000"
            :step="100"
            addon-before="慢查询阈值"
            addon-after="ms"
            style="width: 200px"
          />
          <a-button @click="clearHistory" type="outline" status="danger">
            清除历史记录
          </a-button>
        </a-space>
      </div>
    </div>

    <a-divider />

    <a-tabs default-active-key="analyses" :animation="false">
      <a-tab-pane key="analyses" title="性能分析">
        <div class="analyses-content">
          <div v-if="analyses.length === 0" class="empty-state">
            <a-empty description="暂无性能分析数据" />
          </div>
          
          <div v-else class="analyses-list">
            <div
              v-for="analysis in analyses"
              :key="analysis.queryId"
              class="analysis-item"
            >
              <a-card size="small">
                <div class="analysis-header">
                  <div class="analysis-info">
                    <span class="analysis-time">
                      {{ new Date(analysis.analysisTimestamp).toLocaleString() }}
                    </span>
                    <a-tag :color="getScoreColor(analysis.performanceScore)">
                      性能评分: {{ analysis.performanceScore.toFixed(0) }}
                    </a-tag>
                  </div>
                  
                  <div class="analysis-metrics">
                    <a-tag size="small">{{ analysis.metrics.index }}</a-tag>
                    <a-tag size="small" color="blue">
                      {{ analysis.metrics.executionTimeMs }}ms
                    </a-tag>
                    <a-tag size="small" color="green">
                      {{ analysis.metrics.resultCount }} 条结果
                    </a-tag>
                  </div>
                </div>

                <div v-if="analysis.recommendations.length > 0" class="recommendations">
                  <h4>优化建议</h4>
                  <div
                    v-for="(rec, index) in analysis.recommendations"
                    :key="index"
                    class="recommendation-item"
                  >
                    <div class="recommendation-header">
                      <a-tag
                        :color="getSeverityColor(rec.severity)"
                        size="small"
                      >
                        {{ getSeverityText(rec.severity) }}
                      </a-tag>
                      <span class="recommendation-title">{{ rec.title }}</span>
                      <span class="impact-score">
                        影响: {{ rec.impactScore }}/10
                      </span>
                    </div>
                    <div class="recommendation-content">
                      <p class="description">{{ rec.description }}</p>
                      <p class="suggestion">
                        <strong>建议:</strong> {{ rec.suggestion }}
                      </p>
                    </div>
                  </div>
                </div>

                <a-collapse>
                  <a-collapse-item header="查看查询详情" key="query">
                    <pre class="query-json">{{ JSON.stringify(analysis.metrics.query, null, 2) }}</pre>
                  </a-collapse-item>
                </a-collapse>
              </a-card>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="history" title="查询历史">
        <div class="history-content">
          <a-table
            :columns="historyColumns"
            :data="performanceHistory.slice(0, 50)"
            :pagination="false"
            size="small"
            stripe
          >
            <template #timestamp="{ record }">
              {{ new Date(record.timestamp).toLocaleString() }}
            </template>
            
            <template #executionTime="{ record }">
              <a-tag
                :color="record.executionTimeMs > slowQueryThreshold ? 'red' : 'green'"
                size="small"
              >
                {{ record.executionTimeMs }}ms
              </a-tag>
            </template>
            
            <template #shards="{ record }">
              <span>
                {{ record.shardsSuccessful }}/{{ record.shardsTotal }}
                <span v-if="record.shardsFailed > 0" style="color: #f5222d;">
                  ({{ record.shardsFailed }} 失败)
                </span>
              </span>
            </template>
            
            <template #status="{ record }">
              <a-tag
                :color="record.timedOut ? 'red' : (record.shardsFailed > 0 ? 'orange' : 'green')"
                size="small"
              >
                {{ record.timedOut ? '超时' : (record.shardsFailed > 0 ? '部分失败' : '成功') }}
              </a-tag>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePerformanceStore } from '../stores/performance'
import { Message, Modal } from '@arco-design/web-vue'

const performanceStore = usePerformanceStore()

const performanceHistory = computed(() => performanceStore.performanceHistory)
const analyses = computed(() => performanceStore.analyses)
const stats = computed(() => performanceStore.getPerformanceStats())

const slowQueryThreshold = computed({
  get: () => performanceStore.slowQueryThreshold,
  set: (value) => performanceStore.slowQueryThreshold = value
})

// 表格列定义
const historyColumns = [
  {
    title: '时间',
    dataIndex: 'timestamp',
    slotName: 'timestamp',
    width: 150
  },
  {
    title: '索引',
    dataIndex: 'index',
    width: 120
  },
  {
    title: '执行时间',
    dataIndex: 'executionTimeMs',
    slotName: 'executionTime',
    width: 100
  },
  {
    title: '结果数',
    dataIndex: 'resultCount',
    width: 80
  },
  {
    title: '分片状态',
    slotName: 'shards',
    width: 120
  },
  {
    title: '状态',
    slotName: 'status',
    width: 80
  }
]

// 获取性能评分颜色
const getScoreColor = (score: number) => {
  if (score >= 80) return 'green'
  if (score >= 60) return 'orange'
  return 'red'
}

// 获取严重级别颜色
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'red'
    case 'high': return 'orange'
    case 'medium': return 'blue'
    case 'low': return 'gray'
    default: return 'gray'
  }
}

// 获取严重级别文本
const getSeverityText = (severity: string) => {
  switch (severity) {
    case 'critical': return '严重'
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return '未知'
  }
}

// 清除历史记录
const clearHistory = () => {
  Modal.confirm({
    title: '确认清除',
    content: '确定要清除所有性能分析历史记录吗？此操作无法撤销。',
    onOk: () => {
      performanceStore.clearHistory()
      Message.success('历史记录已清除')
    }
  })
}
</script>

<style scoped>
.performance-analysis {
  height: 100%;
  padding: 16px;
}

.analysis-header {
  margin-bottom: 16px;
}

.analyses-content,
.history-content {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.analyses-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.analysis-item {
  border-radius: 4px;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.analysis-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.analysis-time {
  font-size: 12px;
  color: var(--color-text-2);
}

.analysis-metrics {
  display: flex;
  gap: 4px;
}

.recommendations {
  margin: 16px 0;
}

.recommendations h4 {
  margin-bottom: 12px;
  color: var(--color-text-1);
}

.recommendation-item {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--color-fill-1);
  border-radius: 4px;
}

.recommendation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.recommendation-title {
  font-weight: 500;
  color: var(--color-text-1);
}

.impact-score {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-2);
}

.recommendation-content {
  font-size: 13px;
}

.description {
  margin-bottom: 4px;
  color: var(--color-text-2);
}

.suggestion {
  color: var(--color-text-1);
  margin: 0;
}

.query-json {
  max-height: 200px;
  overflow-y: auto;
  font-size: 11px;
  background: var(--color-fill-2);
  padding: 8px;
  border-radius: 4px;
}
</style>