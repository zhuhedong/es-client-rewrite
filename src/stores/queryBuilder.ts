import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Api } from '../api'
import { useConnectionStore } from './connection'
import type { QueryBuilderConfig, QueryGroup, QueryCondition, FieldInfo, SortConfig } from '../types'
import { Message } from '@arco-design/web-vue'

export const useQueryBuilderStore = defineStore('queryBuilder', () => {
  const config = ref<QueryBuilderConfig>({
    index: '',
    groups: [],
    sort: [],
    from: 0,
    size: 10
  })
  
  const fields = ref<FieldInfo[]>([])
  const loading = ref(false)
  const executing = ref(false)
  const results = ref<any>(null)

  const connectionStore = useConnectionStore()

  // 生成查询对象
  const generatedQuery = computed(() => {
    try {
      const query = buildElasticsearchQuery(config.value)
      return {
        query,
        isValid: true,
        errors: []
      }
    } catch (error: any) {
      return {
        query: null,
        isValid: false,
        errors: [error.message]
      }
    }
  })

  // 构建Elasticsearch查询
  const buildElasticsearchQuery = (config: QueryBuilderConfig): any => {
    if (config.groups.length === 0) {
      return { match_all: {} }
    }

    const query: any = {
      bool: {}
    }

    // 处理查询组
    const processGroups = (groups: QueryGroup[]): any => {
      const boolQuery: any = {}

      for (const group of groups) {
        const groupQueries: any[] = []

        // 处理条件
        for (const condition of group.conditions) {
          const conditionQuery = buildConditionQuery(condition)
          if (conditionQuery) {
            groupQueries.push(conditionQuery)
          }
        }

        // 处理嵌套组
        for (const nestedGroup of group.groups) {
          const nestedQuery = processGroups([nestedGroup])
          if (nestedQuery) {
            groupQueries.push({ bool: nestedQuery })
          }
        }

        if (groupQueries.length > 0) {
          if (!boolQuery[group.operator]) {
            boolQuery[group.operator] = []
          }
          boolQuery[group.operator].push(...groupQueries)
        }
      }

      return Object.keys(boolQuery).length > 0 ? boolQuery : null
    }

    const processedQuery = processGroups(config.groups)
    if (processedQuery) {
      query.bool = processedQuery
    }

    return query
  }

  // 构建单个条件查询
  const buildConditionQuery = (condition: QueryCondition): any => {
    const { field, operator, value, dataType } = condition

    if (!field || !operator || (value === null || value === undefined || value === '')) {
      return null
    }

    switch (operator) {
      case 'equals':
        return dataType === 'text' 
          ? { match: { [field]: value } }
          : { term: { [field]: value } }

      case 'not_equals':
        return {
          bool: {
            must_not: [
              dataType === 'text' 
                ? { match: { [field]: value } }
                : { term: { [field]: value } }
            ]
          }
        }

      case 'contains':
        return { wildcard: { [field]: `*${value}*` } }

      case 'starts_with':
        return { prefix: { [field]: value } }

      case 'ends_with':
        return { wildcard: { [field]: `*${value}` } }

      case 'greater_than':
        return { range: { [field]: { gt: value } } }

      case 'greater_equal':
        return { range: { [field]: { gte: value } } }

      case 'less_than':
        return { range: { [field]: { lt: value } } }

      case 'less_equal':
        return { range: { [field]: { lte: value } } }

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return { range: { [field]: { gte: value[0], lte: value[1] } } }
        }
        return null

      case 'in':
        const values = Array.isArray(value) ? value : value.split(',').map((v: string) => v.trim())
        return { terms: { [field]: values } }

      case 'not_in':
        const notValues = Array.isArray(value) ? value : value.split(',').map((v: string) => v.trim())
        return {
          bool: {
            must_not: [{ terms: { [field]: notValues } }]
          }
        }

      case 'exists':
        return { exists: { field } }

      case 'not_exists':
        return {
          bool: {
            must_not: [{ exists: { field } }]
          }
        }

      case 'regex':
        return { regexp: { [field]: value } }

      default:
        return null
    }
  }

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

  // 执行查询
  const executeQuery = async () => {
    if (!connectionStore.currentConnection?.id || !config.value.index) {
      Message.error('请选择连接和索引')
      return
    }

    if (!generatedQuery.value.isValid) {
      Message.error('查询配置无效: ' + generatedQuery.value.errors.join(', '))
      return
    }

    executing.value = true
    try {
      const searchQuery = {
        index: config.value.index,
        query: generatedQuery.value.query,
        from: config.value.from || 0,
        size: config.value.size || 10,
        sort: config.value.sort?.map(s => ({ [s.field]: { order: s.order } }))
      }

      results.value = await Api.searchDocuments(connectionStore.currentConnection.id, searchQuery)
      Message.success(`查询完成，找到 ${results.value.total} 条记录`)
    } catch (error: any) {
      Message.error(`查询失败: ${error.message}`)
      results.value = null
    } finally {
      executing.value = false
    }
  }

  // 添加查询组
  const addGroup = (parentGroupId?: string) => {
    const newGroup: QueryGroup = {
      id: `group_${Date.now()}`,
      operator: 'must',
      conditions: [],
      groups: []
    }

    if (parentGroupId) {
      // 添加到指定组
      const parentGroup = findGroupById(config.value.groups, parentGroupId)
      if (parentGroup) {
        parentGroup.groups.push(newGroup)
      }
    } else {
      // 添加到根级别
      config.value.groups.push(newGroup)
    }
  }

  // 添加查询条件
  const addCondition = (groupId: string) => {
    const group = findGroupById(config.value.groups, groupId)
    if (group) {
      const newCondition: QueryCondition = {
        id: `condition_${Date.now()}`,
        field: '',
        operator: 'equals',
        value: '',
        dataType: 'text'
      }
      group.conditions.push(newCondition)
    }
  }

  // 查找组
  const findGroupById = (groups: QueryGroup[], id: string): QueryGroup | null => {
    for (const group of groups) {
      if (group.id === id) {
        return group
      }
      const nested = findGroupById(group.groups, id)
      if (nested) {
        return nested
      }
    }
    return null
  }

  // 删除组
  const removeGroup = (groupId: string) => {
    const removeFromArray = (groups: QueryGroup[]): boolean => {
      for (let i = 0; i < groups.length; i++) {
        if (groups[i].id === groupId) {
          groups.splice(i, 1)
          return true
        }
        if (removeFromArray(groups[i].groups)) {
          return true
        }
      }
      return false
    }
    
    removeFromArray(config.value.groups)
  }

  // 删除条件
  const removeCondition = (groupId: string, conditionId: string) => {
    const group = findGroupById(config.value.groups, groupId)
    if (group) {
      const index = group.conditions.findIndex(c => c.id === conditionId)
      if (index > -1) {
        group.conditions.splice(index, 1)
      }
    }
  }

  // 添加排序
  const addSort = () => {
    if (!config.value.sort) {
      config.value.sort = []
    }
    config.value.sort.push({
      field: '',
      order: 'asc'
    })
  }

  // 删除排序
  const removeSort = (index: number) => {
    if (config.value.sort) {
      config.value.sort.splice(index, 1)
    }
  }

  // 重置配置
  const resetConfig = () => {
    config.value = {
      index: '',
      groups: [],
      sort: [],
      from: 0,
      size: 10
    }
    fields.value = []
    results.value = null
  }

  // 设置索引
  const setIndex = async (index: string) => {
    config.value.index = index
    config.value.groups = [] // 清空现有查询条件
    results.value = null
    await fetchIndexFields(index)
  }

  return {
    config,
    fields,
    loading,
    executing,
    results,
    generatedQuery,
    fetchIndexFields,
    executeQuery,
    addGroup,
    addCondition,
    removeGroup,
    removeCondition,
    addSort,
    removeSort,
    resetConfig,
    setIndex,
    findGroupById
  }
})