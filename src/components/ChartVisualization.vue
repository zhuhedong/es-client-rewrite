<template>
  <div class="chart-visualization">
    <div v-if="!chartConfig || !chartConfig.data || chartConfig.data.length === 0" class="no-data">
      <a-empty description="暂无数据" />
    </div>
    
    <div v-else class="chart-container">
      <!-- 图表标题和操作 -->
      <div class="chart-header">
        <h3 class="chart-title">{{ chartConfig.title }}</h3>
        <div class="chart-actions">
          <a-dropdown>
            <a-button size="small" type="outline">
              <template #icon>
                <icon-more />
              </template>
            </a-button>
            <template #content>
              <a-doption @click="exportData('json')">导出JSON</a-doption>
              <a-doption @click="exportData('csv')">导出CSV</a-doption>
              <a-doption @click="$emit('remove')">删除图表</a-doption>
            </template>
          </a-dropdown>
        </div>
      </div>

      <!-- ECharts 图表 -->
      <div class="chart-content">
        <v-chart 
          :option="chartOption" 
          :style="{ height: chartHeight + 'px' }"
          autoresize
        />
      </div>

      <!-- 数据表格 (可选) -->
      <div v-if="showTable" class="chart-table">
        <a-table 
          :data="chartConfig.data"
          :pagination="false"
          :scroll="{ y: 200 }"
          size="small"
        >
          <a-table-column 
            v-for="column in tableColumns" 
            :key="column.key"
            :title="column.title"
            :data-index="column.key"
          />
        </a-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue'
import VChart from 'vue-echarts'
import { IconMore } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import type { ChartConfig } from '../stores/visualization'
import { useVisualizationStore } from '../stores/visualization'

const props = defineProps<{
  chartConfig: ChartConfig
  height?: number
  showTable?: boolean
}>()

const emit = defineEmits<{
  remove: []
  export: [data: any, format: string]
}>()

const visualizationStore = useVisualizationStore()
const chartHeight = computed(() => props.height || 300)

// 生成ECharts配置
const chartOption = computed(() => {
  if (!props.chartConfig || !props.chartConfig.data) {
    return {}
  }

  const { type, data, xField, yField, colorField, options } = props.chartConfig

  switch (type) {
    case 'bar':
    case 'column':
      return {
        title: {
          text: props.chartConfig.title,
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item[xField || 'key']),
          axisLabel: {
            rotate: data.length > 10 ? 45 : 0
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          type: 'bar',
          data: data.map(item => item[yField || 'value']),
          itemStyle: {
            color: function(params: any) {
              const colors = [
                '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
                '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#c4b5fd'
              ]
              return colors[params.dataIndex % colors.length]
            }
          }
        }],
        dataZoom: data.length > 20 ? [{
          type: 'slider',
          show: true,
          start: 0,
          end: 50
        }] : undefined,
        ...options
      }

    case 'line':
      return {
        title: {
          text: props.chartConfig.title,
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item[xField || 'key']),
          boundaryGap: false
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          type: 'line',
          data: data.map(item => item[yField || 'value']),
          smooth: true,
          areaStyle: {
            opacity: 0.3
          },
          itemStyle: {
            color: '#5470c6'
          }
        }],
        dataZoom: data.length > 20 ? [{
          type: 'slider',
          show: true,
          start: 0,
          end: 50
        }] : undefined,
        ...options
      }

    case 'pie':
      return {
        title: {
          text: props.chartConfig.title,
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 10,
          top: 20,
          bottom: 20
        },
        series: [{
          name: props.chartConfig.title,
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          data: data.map(item => ({
            name: item[xField || colorField || 'key'],
            value: item[yField || 'value']
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: data.length <= 10
          }
        }],
        ...options
      }

    case 'area':
      return {
        title: {
          text: props.chartConfig.title,
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item[xField || 'key'])
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          type: 'line',
          data: data.map(item => item[yField || 'value']),
          areaStyle: {},
          itemStyle: {
            color: '#91cc75'
          }
        }],
        ...options
      }

    default:
      return {
        title: {
          text: props.chartConfig.title,
          left: 'center'
        },
        ...options
      }
  }
})

// 表格列配置
const tableColumns = computed(() => {
  if (!props.chartConfig.data || props.chartConfig.data.length === 0) {
    return []
  }

  const firstItem = props.chartConfig.data[0]
  return Object.keys(firstItem).map(key => ({
    key,
    title: key === 'key' ? '分类' : 
           key === 'value' ? '数值' : 
           key === 'doc_count' ? '文档数' : key
  }))
})

// 导出数据
const exportData = (format: 'json' | 'csv') => {
  try {
    const exportedData = visualizationStore.exportChartData(props.chartConfig, format)
    
    // 创建下载链接
    const blob = new Blob([exportedData], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.chartConfig.title}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    Message.success(`已导出 ${format.toUpperCase()} 格式数据`)
    emit('export', exportedData, format)
  } catch (error) {
    console.error('Export failed:', error)
    Message.error('导出失败')
  }
}
</script>

<style scoped>
.chart-visualization {
  height: 100%;
  width: 100%;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background: linear-gradient(135deg, var(--gray-50), white);
  border-radius: var(--radius-xl);
  border: 2px dashed var(--gray-300);
}

.chart-container {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, var(--gray-50), white);
  border-bottom: 1px solid var(--gray-200);
}

.chart-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-800);
}

.chart-actions {
  display: flex;
  gap: 0.5rem;
}

.chart-content {
  padding: 1rem;
  min-height: 200px;
}

.chart-table {
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chart-header {
    padding: 0.75rem 1rem;
  }
  
  .chart-title {
    font-size: 1rem;
  }
  
  .chart-content {
    padding: 0.75rem;
  }
}

/* ECharts容器样式 */
:deep(.echarts) {
  width: 100% !important;
  height: 100% !important;
}

/* 下拉菜单样式 */
:deep(.arco-dropdown-option) {
  font-size: 0.875rem;
}

:deep(.arco-dropdown-option:hover) {
  background-color: var(--primary-color-light-1);
  color: var(--primary-color);
}
</style>