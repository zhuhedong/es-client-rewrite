<template>
  <div class="visualization-panel">
    <div class="panel-header">
      <h3>数据可视化</h3>
      <a-space>
        <a-button @click="createVisualization" :disabled="!hasAggregationData" type="primary" size="small">
          <template #icon>
            <icon-bar-chart />
          </template>
          生成图表
        </a-button>
        <a-button @click="clearVisualizations" :disabled="!hasVisualizations" size="small">
          <template #icon>
            <icon-delete />
          </template>
          清空图表
        </a-button>
      </a-space>
    </div>

    <!-- 无数据状态 -->
    <div v-if="!hasAggregationData && !hasVisualizations" class="no-data-state">
      <a-empty description="执行包含聚合的查询以生成可视化图表" />
    </div>

    <!-- 可视化图表展示 -->
    <div v-else-if="currentVisualization" class="visualization-content">
      <div class="visualization-info">
        <h4>{{ currentVisualization.name }}</h4>
        <span class="chart-count">共 {{ currentVisualization.chartConfigs.length }} 个图表</span>
      </div>

      <!-- 图表网格 -->
      <div class="charts-grid">
        <div 
          v-for="(chart, index) in currentVisualization.chartConfigs" 
          :key="`chart-${index}`"
          class="chart-item"
          :class="{ 'chart-fullwidth': chart.type === 'table' }"
        >
          <ChartVisualization
            :chart-config="chart"
            :height="getChartHeight(chart.type)"
            :show-table="chart.type === 'table'"
            @remove="removeChart(index)"
            @export="onChartExport"
          />
        </div>
      </div>

      <!-- 历史可视化列表 -->
      <div v-if="visualizations.length > 1" class="history-section">
        <a-collapse>
          <a-collapse-item key="history" title="历史可视化">
            <div class="history-list">
              <div 
                v-for="viz in visualizations" 
                :key="viz.id"
                class="history-item"
                :class="{ active: currentVisualization?.id === viz.id }"
                @click="selectVisualization(viz)"
              >
                <div class="history-info">
                  <h5>{{ viz.name }}</h5>
                  <span class="history-meta">
                    {{ viz.chartConfigs.length }} 个图表 • 
                    {{ formatDate(viz.createdAt) }}
                  </span>
                </div>
                <a-button 
                  size="mini" 
                  type="text" 
                  @click.stop="removeVisualization(viz.id)"
                >
                  <template #icon>
                    <icon-delete />
                  </template>
                </a-button>
              </div>
            </div>
          </a-collapse-item>
        </a-collapse>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, watch } from 'vue'
import { IconBarChart, IconDelete } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import ChartVisualization from './ChartVisualization.vue'
import { useVisualizationStore } from '../stores/visualization'
import type { AggregationResult } from '../types'

const props = defineProps<{
  searchResult?: any
  aggregationResult?: AggregationResult
}>()

const visualizationStore = useVisualizationStore()

// 响应式数据
const visualizations = computed(() => visualizationStore.visualizations)
const currentVisualization = computed(() => visualizationStore.currentVisualization)

// 计算属性
const hasAggregationData = computed(() => {
  return props.searchResult?.aggregations || props.aggregationResult?.aggregations
})

const hasVisualizations = computed(() => {
  return visualizations.value.length > 0
})

// 监听搜索结果变化，自动生成可视化
watch(
  () => props.searchResult,
  (newResult) => {
    if (newResult?.aggregations && Object.keys(newResult.aggregations).length > 0) {
      // 自动为包含聚合的搜索结果创建可视化
      const vizName = `查询结果 - ${new Date().toLocaleString()}`
      visualizationStore.createVisualizationFromAggregation(newResult, vizName)
    }
  },
  { deep: true }
)

// 创建可视化
const createVisualization = () => {
  const result = props.aggregationResult || props.searchResult
  if (!result?.aggregations) {
    Message.warning('当前查询结果不包含聚合数据')
    return
  }

  const vizName = `可视化 - ${new Date().toLocaleString()}`
  visualizationStore.createVisualizationFromAggregation(result, vizName)
  Message.success('已生成可视化图表')
}

// 清空可视化
const clearVisualizations = () => {
  visualizationStore.clearVisualizations()
  Message.success('已清空所有可视化图表')
}

// 移除单个图表
const removeChart = (chartIndex: number) => {
  if (currentVisualization.value) {
    visualizationStore.removeChart(currentVisualization.value.id, chartIndex)
    Message.success('已删除图表')
  }
}

// 移除可视化
const removeVisualization = (vizId: string) => {
  visualizationStore.removeVisualization(vizId)
  Message.success('已删除可视化')
}

// 选择可视化
const selectVisualization = (viz: any) => {
  visualizationStore.currentVisualization = viz
}

// 图表导出回调
const onChartExport = (data: any, format: string) => {
  console.log('Chart exported:', format, data)
}

// 获取图表高度
const getChartHeight = (chartType: string): number => {
  switch (chartType) {
    case 'pie':
      return 350
    case 'table':
      return 250
    case 'line':
    case 'area':
      return 300
    case 'bar':
    case 'column':
    default:
      return 280
  }
}

// 格式化日期
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.visualization-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--gray-200);
  background: linear-gradient(135deg, var(--gray-50), white);
}

.panel-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gray-800);
}

.no-data-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, var(--gray-50), white);
  border-radius: var(--radius-xl);
  margin: 1rem;
  border: 2px dashed var(--gray-300);
}

.visualization-content {
  flex: 1;
  padding: 1rem;
  overflow: auto;
}

.visualization-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--primary-color-light-1), var(--primary-color-light-2));
  border-radius: var(--radius-lg);
  border: 1px solid var(--primary-color-light-3);
}

.visualization-info h4 {
  margin: 0;
  color: var(--primary-color);
  font-weight: 600;
}

.chart-count {
  color: var(--primary-color);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  background: var(--primary-color-light-2);
  border-radius: var(--radius);
  border: 1px solid var(--primary-color-light-3);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-item {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.chart-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.chart-fullwidth {
  grid-column: 1 / -1;
}

.history-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--gray-200);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: var(--gray-50);
  border-color: var(--primary-color);
  transform: translateX(4px);
}

.history-item.active {
  background: var(--primary-color-light-1);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.history-info h5 {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.history-meta {
  font-size: 0.75rem;
  color: var(--gray-600);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .panel-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .visualization-info {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
    text-align: center;
  }
}

/* 折叠面板样式优化 */
:deep(.arco-collapse) {
  background: transparent;
  border: none;
}

:deep(.arco-collapse-item-header) {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  font-weight: 600;
  color: var(--gray-700);
}

:deep(.arco-collapse-item-content) {
  background: transparent;
  border: none;
  padding: 1rem 0 0 0;
}

:deep(.arco-collapse-item-content-box) {
  padding: 0;
}
</style>