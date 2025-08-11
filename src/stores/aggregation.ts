import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Api } from '../api'
import { useConnectionStore } from './connection'
import type { AggregationConfig, AggregationRequest, AggregationResult, FieldInfo, ChartConfig } from '../types'
import { Message } from '@arco-design/web-vue'

export const useAggregationStore = defineStore('aggregation', () => {
  const config = ref<AggregationRequest>({
    index: '',
    query: null,
    aggregations: [],
    size: 0
  })
  
  const fields = ref<FieldInfo[]>([])
  const loading = ref(false)
  const executing = ref(false)
  const results = ref<AggregationResult | null>(null)
  const chartConfigs = ref<ChartConfig[]>([])

  const connectionStore = useConnectionStore()

  // 可用的聚合类型
  const aggregationTypes = [
    { value: 'terms', label: '词项聚合', category: 'bucket', description: '按字段值分组' },
    { value: 'date_histogram', label: '日期直方图', category: 'bucket', description: '按时间间隔分组' },
    { value: 'histogram', label: '数值直方图', category: 'bucket', description: '按数值间隔分组' },
    { value: 'range', label: '范围聚合', category: 'bucket', description: '按数值范围分组' },
    { value: 'avg', label: '平均值', category: 'metric', description: '计算字段平均值' },
    { value: 'sum', label: '总和', category: 'metric', description: '计算字段总和' },
    { value: 'max', label: '最大值', category: 'metric', description: '计算字段最大值' },
    { value: 'min', label: '最小值', category: 'metric', description: '计算字段最小值' },
    { value: 'count', label: '计数', category: 'metric', description: '计算文档数量' },
    { value: 'cardinality', label: '唯一值计数', category: 'metric', description: '计算字段唯一值数量' }
  ]

  // 按类别分组的聚合类型
  const bucketAggregations = computed(() => 
    aggregationTypes.filter(t => t.category === 'bucket')
  )
  
  const metricAggregations = computed(() => 
    aggregationTypes.filter(t => t.category === 'metric')
  )

  // 可聚合的字段
  const aggregatableFields = computed(() => {
    return fields.value.filter(field => field.aggregatable)
  })

  // 日期类型字段
  const dateFields = computed(() => {
    return fields.value.filter(field => field.type === 'date')
  })

  // 数值类型字段  
  const numericFields = computed(() => {
    return fields.value.filter(field => ['long', 'integer', 'short', 'byte', 'double', 'float'].includes(field.type))
  })

  // 获取索引字段信息
  const fetchIndexFields = async (index: string) => {
    if (!connectionStore.currentConnection?.id || !index) {
      return
    }

    loading.value = true
    try {
      const mapping = await Api.getIndexMapping(connectionStore.currentConnection.id, index)
      const indexMapping = mapping[index]?.mappings?.properties || {}
      
      fields.value = extractFieldsFromMapping(indexMapping)
    } catch (error: any) {
      Message.error(`获取字段信息失败: ${error.message}`)
      fields.value = []
    } finally {
      loading.value = false
    }
  }

  // 从映射中提取字段信息
  const extractFieldsFromMapping = (properties: any, prefix = ''): FieldInfo[] => {
    const fieldsList: FieldInfo[] = []

    for (const [fieldName, fieldConfig] of Object.entries(properties)) {
      const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName
      const config = fieldConfig as any

      if (config.type) {
        fieldsList.push({
          name: fullFieldName,
          type: config.type,
          searchable: isSearchableType(config.type),
          aggregatable: isAggregatableType(config.type)
        })
      }

      // 处理嵌套字段
      if (config.properties) {
        const nestedFields = extractFieldsFromMapping(config.properties, fullFieldName)
        fieldsList.push(...nestedFields)
      }

      // 处理multi-field
      if (config.fields) {
        const multiFields = extractFieldsFromMapping(config.fields, fullFieldName)
        fieldsList.push(...multiFields)
      }
    }

    return fieldsList
  }

  // 判断字段类型是否可搜索
  const isSearchableType = (type: string): boolean => {
    return ['text', 'keyword', 'long', 'integer', 'short', 'byte', 'double', 'float', 'date', 'boolean'].includes(type)
  }

  // 判断字段类型是否可聚合
  const isAggregatableType = (type: string): boolean => {
    return ['keyword', 'long', 'integer', 'short', 'byte', 'double', 'float', 'date', 'boolean'].includes(type)
  }

  // 添加聚合配置
  const addAggregation = (parentId?: string) => {
    const newAgg: AggregationConfig = {
      id: `agg_${Date.now()}`,
      name: `聚合_${config.value.aggregations.length + 1}`,
      type: 'terms',
      field: '',
      params: {}
    }

    if (parentId) {
      // 添加为子聚合
      const parent = findAggregationById(config.value.aggregations, parentId)
      if (parent) {
        if (!parent.subAggregations) {
          parent.subAggregations = []
        }
        parent.subAggregations.push(newAgg)
      }
    } else {
      // 添加到根级别
      config.value.aggregations.push(newAgg)
    }
  }

  // 查找聚合配置
  const findAggregationById = (aggregations: AggregationConfig[], id: string): AggregationConfig | null => {
    for (const agg of aggregations) {
      if (agg.id === id) {
        return agg
      }
      if (agg.subAggregations) {
        const nested = findAggregationById(agg.subAggregations, id)
        if (nested) {
          return nested
        }
      }
    }
    return null
  }

  // 删除聚合配置
  const removeAggregation = (id: string) => {
    const removeFromArray = (aggregations: AggregationConfig[]): boolean => {
      for (let i = 0; i < aggregations.length; i++) {
        if (aggregations[i].id === id) {
          aggregations.splice(i, 1)
          return true
        }
        if (aggregations[i].subAggregations) {
          if (removeFromArray(aggregations[i].subAggregations!)) {
            return true
          }
        }
      }
      return false
    }
    
    removeFromArray(config.value.aggregations)
  }

  // 更新聚合配置
  const updateAggregation = (id: string, updates: Partial<AggregationConfig>) => {
    const agg = findAggregationById(config.value.aggregations, id)
    if (agg) {
      Object.assign(agg, updates)
    }
  }

  // 执行聚合查询
  const executeAggregation = async () => {
    if (!connectionStore.currentConnection?.id || !config.value.index) {
      Message.error('请选择连接和索引')
      return
    }

    if (config.value.aggregations.length === 0) {
      Message.error('请添加至少一个聚合配置')
      return
    }

    executing.value = true
    try {
      results.value = await Api.executeAggregation(connectionStore.currentConnection.id, config.value)
      
      // 生成图表配置
      generateChartConfigs()
      
      Message.success(`聚合查询完成，耗时 ${results.value.took}ms`)
    } catch (error: any) {
      Message.error(`聚合查询失败: ${error.message}`)
      results.value = null
      chartConfigs.value = []
    } finally {
      executing.value = false
    }
  }

  // 生成图表配置
  const generateChartConfigs = () => {
    if (!results.value?.aggregations) {
      chartConfigs.value = []
      return
    }

    chartConfigs.value = []
    
    // 遍历聚合结果生成图表配置
    for (const agg of config.value.aggregations) {
      const aggResult = results.value.aggregations[agg.name]
      if (aggResult) {
        const chartConfig = createChartConfig(agg, aggResult)
        if (chartConfig) {
          chartConfigs.value.push(chartConfig)
        }
      }
    }
  }

  // 创建图表配置
  const createChartConfig = (agg: AggregationConfig, result: any): ChartConfig | null => {
    switch (agg.type) {
      case 'terms':
        return {
          type: 'bar',
          title: `${agg.name} - 词项聚合`,
          xField: 'key',
          yField: 'doc_count',
          data: result.buckets || []
        }
        
      case 'date_histogram':
        return {
          type: 'line',
          title: `${agg.name} - 日期分布`,
          xField: 'key_as_string',
          yField: 'doc_count',
          data: result.buckets || []
        }
        
      case 'histogram':
        return {
          type: 'bar',
          title: `${agg.name} - 数值分布`,
          xField: 'key',
          yField: 'doc_count',
          data: result.buckets || []
        }
        
      case 'range':
        return {
          type: 'bar',
          title: `${agg.name} - 范围分布`,
          xField: 'key',
          yField: 'doc_count',
          data: result.buckets?.map((bucket: any) => ({
            key: bucket.key || `${bucket.from || '*'} - ${bucket.to || '*'}`,
            doc_count: bucket.doc_count
          })) || []
        }
        
      default:
        // 度量聚合显示为表格
        return {
          type: 'table',
          title: `${agg.name} - 度量值`,
          data: [{
            metric: agg.name,
            value: result.value || result.value_as_string || 0
          }]
        }
    }
  }

  // 设置索引
  const setIndex = async (index: string) => {
    config.value.index = index
    config.value.aggregations = [] // 清空现有聚合
    results.value = null
    chartConfigs.value = []
    await fetchIndexFields(index)
  }

  // 重置配置
  const resetConfig = () => {
    config.value = {
      index: '',
      query: null,
      aggregations: [],
      size: 0
    }
    fields.value = []
    results.value = null
    chartConfigs.value = []
  }

  // 验证聚合配置
  const validateAggregation = (agg: AggregationConfig): string[] => {
    const errors: string[] = []
    
    if (!agg.name.trim()) {
      errors.push('聚合名称不能为空')
    }
    
    if (!agg.field && agg.type !== 'count') {
      errors.push('请选择聚合字段')
    }
    
    // 特定类型的验证
    if (agg.type === 'date_histogram' && !dateFields.value.find(f => f.name === agg.field)) {
      errors.push('日期直方图聚合需要选择日期类型字段')
    }
    
    if (agg.type === 'histogram' && !numericFields.value.find(f => f.name === agg.field)) {
      errors.push('数值直方图聚合需要选择数值类型字段')
    }
    
    return errors
  }

  return {
    config,
    fields,
    loading,
    executing,
    results,
    chartConfigs,
    aggregationTypes,
    bucketAggregations,
    metricAggregations,
    aggregatableFields,
    dateFields,
    numericFields,
    fetchIndexFields,
    addAggregation,
    removeAggregation,
    updateAggregation,
    findAggregationById,
    executeAggregation,
    setIndex,
    resetConfig,
    validateAggregation
  }
})