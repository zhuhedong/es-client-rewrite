import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'column' | 'table'

export interface ChartConfig {
  type: ChartType
  title: string
  data: any[]
  xField?: string
  yField?: string
  colorField?: string
  options?: any
}

export interface VisualizationData {
  id: string
  name: string
  chartConfigs: ChartConfig[]
  aggregationResult: any
  createdAt: number
}

export const useVisualizationStore = defineStore('visualization', () => {
  const visualizations = ref<VisualizationData[]>([])
  const currentVisualization = ref<VisualizationData | null>(null)

  // 从聚合结果创建可视化
  const createVisualizationFromAggregation = (aggregationResult: any, name: string): VisualizationData => {
    const chartConfigs = extractChartsFromAggregation(aggregationResult.aggregations || {})
    
    const visualization: VisualizationData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      chartConfigs,
      aggregationResult,
      createdAt: Date.now()
    }

    visualizations.value.unshift(visualization)
    currentVisualization.value = visualization
    saveToStorage()
    
    return visualization
  }

  // 从聚合结果中提取图表配置
  const extractChartsFromAggregation = (aggregations: any): ChartConfig[] => {
    const charts: ChartConfig[] = []
    
    for (const [aggName, aggResult] of Object.entries(aggregations as Record<string, any>)) {
      if (aggResult.buckets && Array.isArray(aggResult.buckets)) {
        // Terms 聚合或日期直方图聚合
        const data = aggResult.buckets.map((bucket: any) => ({
          key: bucket.key,
          value: bucket.doc_count,
          ...extractSubAggregations(bucket)
        }))

        // 如果数据量适合饼图（< 10个类别）且是简单计数
        if (data.length <= 10 && !hasSubAggregations(aggResult.buckets[0])) {
          charts.push({
            type: 'pie',
            title: `${aggName} 分布`,
            data,
            colorField: 'key',
            yField: 'value'
          })
        }

        // 柱状图
        charts.push({
          type: 'bar',
          title: `${aggName} 统计`,
          data,
          xField: 'key',
          yField: 'value'
        })

        // 如果是时间序列数据，添加折线图
        if (isTimeSeries(data)) {
          charts.push({
            type: 'line',
            title: `${aggName} 趋势`,
            data,
            xField: 'key',
            yField: 'value'
          })
        }

        // 如果有子聚合，创建复杂图表
        if (hasSubAggregations(aggResult.buckets[0])) {
          const subCharts = createSubAggregationCharts(aggName, aggResult.buckets)
          charts.push(...subCharts)
        }
      } else if (aggResult.value !== undefined) {
        // 度量聚合 (avg, sum, max, min, etc.)
        charts.push({
          type: 'table',
          title: `${aggName} 指标`,
          data: [{ metric: aggName, value: aggResult.value }],
          xField: 'metric',
          yField: 'value'
        })
      }
    }

    return charts
  }

  // 提取子聚合数据
  const extractSubAggregations = (bucket: any): Record<string, any> => {
    const result: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(bucket)) {
      if (key !== 'key' && key !== 'doc_count' && typeof value === 'object') {
        if ((value as any).value !== undefined) {
          result[key] = (value as any).value
        }
      }
    }
    
    return result
  }

  // 检查是否有子聚合
  const hasSubAggregations = (bucket: any): boolean => {
    if (!bucket) return false
    
    for (const [key, value] of Object.entries(bucket)) {
      if (key !== 'key' && key !== 'doc_count' && typeof value === 'object') {
        if ((value as any).value !== undefined || (value as any).buckets) {
          return true
        }
      }
    }
    
    return false
  }

  // 检查是否是时间序列数据
  const isTimeSeries = (data: any[]): boolean => {
    if (data.length === 0) return false
    
    // 检查key是否是时间格式
    const firstKey = data[0].key
    if (typeof firstKey === 'string') {
      // 检查是否符合常见的时间格式
      return /^\d{4}-\d{2}-\d{2}/.test(firstKey) || /^\d{13}$/.test(firstKey)
    }
    
    return false
  }

  // 创建子聚合图表
  const createSubAggregationCharts = (parentName: string, buckets: any[]): ChartConfig[] => {
    const charts: ChartConfig[] = []
    const subAggKeys = new Set<string>()
    
    // 收集所有子聚合的键
    buckets.forEach(bucket => {
      Object.keys(bucket).forEach(key => {
        if (key !== 'key' && key !== 'doc_count') {
          subAggKeys.add(key)
        }
      })
    })

    // 为每个子聚合创建图表
    subAggKeys.forEach(subAggKey => {
      const data = buckets.map(bucket => ({
        category: bucket.key,
        value: bucket[subAggKey]?.value || 0
      })).filter(item => item.value !== 0)

      if (data.length > 0) {
        charts.push({
          type: 'column',
          title: `${parentName} - ${subAggKey}`,
          data,
          xField: 'category',
          yField: 'value'
        })
      }
    })

    return charts
  }

  // 自定义图表配置
  const updateChartConfig = (visualizationId: string, chartIndex: number, config: Partial<ChartConfig>) => {
    const visualization = visualizations.value.find(v => v.id === visualizationId)
    if (visualization && visualization.chartConfigs[chartIndex]) {
      Object.assign(visualization.chartConfigs[chartIndex], config)
      saveToStorage()
    }
  }

  // 添加自定义图表
  const addCustomChart = (visualizationId: string, config: ChartConfig) => {
    const visualization = visualizations.value.find(v => v.id === visualizationId)
    if (visualization) {
      visualization.chartConfigs.push(config)
      saveToStorage()
    }
  }

  // 删除图表
  const removeChart = (visualizationId: string, chartIndex: number) => {
    const visualization = visualizations.value.find(v => v.id === visualizationId)
    if (visualization) {
      visualization.chartConfigs.splice(chartIndex, 1)
      saveToStorage()
    }
  }

  // 删除可视化
  const removeVisualization = (id: string) => {
    visualizations.value = visualizations.value.filter(v => v.id !== id)
    if (currentVisualization.value?.id === id) {
      currentVisualization.value = null
    }
    saveToStorage()
  }

  // 导出图表数据
  const exportChartData = (chartConfig: ChartConfig, format: 'json' | 'csv' = 'json') => {
    if (format === 'json') {
      return JSON.stringify(chartConfig.data, null, 2)
    } else if (format === 'csv') {
      if (!chartConfig.data || chartConfig.data.length === 0) return ''
      
      const keys = Object.keys(chartConfig.data[0])
      const header = keys.join(',')
      const rows = chartConfig.data.map(row => 
        keys.map(key => {
          const value = row[key]
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        }).join(',')
      )
      
      return [header, ...rows].join('\n')
    }
    
    return ''
  }

  // 保存到本地存储
  const saveToStorage = () => {
    try {
      localStorage.setItem('es-client-visualizations', JSON.stringify(visualizations.value.slice(0, 50)))
    } catch (error) {
      console.error('Failed to save visualizations:', error)
    }
  }

  // 从本地存储加载
  const loadFromStorage = () => {
    try {
      const data = localStorage.getItem('es-client-visualizations')
      if (data) {
        visualizations.value = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load visualizations:', error)
    }
  }

  // 清空可视化
  const clearVisualizations = () => {
    visualizations.value = []
    currentVisualization.value = null
    saveToStorage()
  }

  // 初始化时加载数据
  loadFromStorage()

  return {
    visualizations,
    currentVisualization,
    createVisualizationFromAggregation,
    updateChartConfig,
    addCustomChart,
    removeChart,
    removeVisualization,
    exportChartData,
    clearVisualizations,
    saveToStorage,
    loadFromStorage
  }
})