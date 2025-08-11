import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchQuery } from '../types'

export interface PerformanceMetrics {
  queryId: string
  connectionId: string
  index: string
  query: any
  executionTimeMs: number
  timestamp: number
  resultCount: number
  tookMs: number
  timedOut: boolean
  shardsTotal: number
  shardsSuccessful: number
  shardsSkipped: number
  shardsFailed: number
}

export interface PerformanceRecommendation {
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  suggestion: string
  impactScore: number // 0-10
}

export interface QueryPerformanceAnalysis {
  queryId: string
  performanceScore: number // 0-100
  recommendations: PerformanceRecommendation[]
  metrics: PerformanceMetrics
  analysisTimestamp: number
}

export const usePerformanceStore = defineStore('performance', () => {
  const performanceHistory = ref<PerformanceMetrics[]>([])
  const analyses = ref<QueryPerformanceAnalysis[]>([])
  const slowQueryThreshold = ref(1000) // 1秒

  // 记录查询性能
  const recordQueryPerformance = (
    query: SearchQuery,
    connectionId: string,
    executionTime: number,
    result: any
  ) => {
    const metrics: PerformanceMetrics = {
      queryId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      connectionId,
      index: query.index,
      query: query.query,
      executionTimeMs: executionTime,
      timestamp: Date.now(),
      resultCount: result?.hits?.total || result?.total || 0,
      tookMs: result?.took || 0,
      timedOut: result?.timed_out || false,
      shardsTotal: result?._shards?.total || 0,
      shardsSuccessful: result?._shards?.successful || 0,
      shardsSkipped: result?._shards?.skipped || 0,
      shardsFailed: result?._shards?.failed || 0
    }

    performanceHistory.value.unshift(metrics)

    // 限制历史记录数量
    if (performanceHistory.value.length > 1000) {
      performanceHistory.value = performanceHistory.value.slice(0, 1000)
    }

    // 如果是慢查询，进行分析
    if (executionTime > slowQueryThreshold.value) {
      const analysis = analyzeQueryPerformance(metrics)
      analyses.value.unshift(analysis)
      
      // 限制分析记录数量
      if (analyses.value.length > 100) {
        analyses.value = analyses.value.slice(0, 100)
      }
    }

    saveToStorage()
  }

  // 分析查询性能
  const analyzeQueryPerformance = (metrics: PerformanceMetrics): QueryPerformanceAnalysis => {
    const recommendations: PerformanceRecommendation[] = []
    let performanceScore = 100

    // 分析执行时间
    if (metrics.executionTimeMs > 5000) {
      recommendations.push({
        category: 'execution_time',
        severity: 'critical',
        title: '查询执行时间过长',
        description: `查询执行时间为 ${metrics.executionTimeMs}ms，超过了推荐的 5000ms 阈值`,
        suggestion: '考虑添加索引、优化查询条件或使用更具体的过滤条件',
        impactScore: 9
      })
      performanceScore -= 30
    } else if (metrics.executionTimeMs > 2000) {
      recommendations.push({
        category: 'execution_time',
        severity: 'high',
        title: '查询执行时间较长',
        description: `查询执行时间为 ${metrics.executionTimeMs}ms，建议优化`,
        suggestion: '检查查询条件是否可以优化，考虑使用缓存',
        impactScore: 6
      })
      performanceScore -= 20
    }

    // 分析分片问题
    if (metrics.shardsFailed > 0) {
      recommendations.push({
        category: 'shards',
        severity: 'critical',
        title: '分片查询失败',
        description: `有 ${metrics.shardsFailed} 个分片查询失败`,
        suggestion: '检查集群健康状态和分片分布情况',
        impactScore: 8
      })
      performanceScore -= 25
    }

    // 分析结果集大小
    if (metrics.resultCount > 10000) {
      recommendations.push({
        category: 'result_size',
        severity: 'medium',
        title: '结果集过大',
        description: `查询返回了 ${metrics.resultCount} 条结果`,
        suggestion: '使用分页或添加更精确的过滤条件来减少结果集大小',
        impactScore: 4
      })
      performanceScore -= 10
    }

    // 分析查询复杂度
    const queryComplexity = analyzeQueryComplexity(metrics.query)
    if (queryComplexity.score > 7) {
      recommendations.push({
        category: 'query_complexity',
        severity: 'medium',
        title: '查询复杂度较高',
        description: queryComplexity.description,
        suggestion: '简化查询条件，避免过度嵌套的布尔查询',
        impactScore: 5
      })
      performanceScore -= 15
    }

    // 检查是否超时
    if (metrics.timedOut) {
      recommendations.push({
        category: 'timeout',
        severity: 'critical',
        title: '查询超时',
        description: '查询在指定时间内未能完成',
        suggestion: '增加查询超时时间或优化查询性能',
        impactScore: 10
      })
      performanceScore -= 40
    }

    return {
      queryId: metrics.queryId,
      performanceScore: Math.max(0, performanceScore),
      recommendations,
      metrics,
      analysisTimestamp: Date.now()
    }
  }

  // 分析查询复杂度
  const analyzeQueryComplexity = (query: any) => {
    let score = 0
    let description = ''
    const issues: string[] = []

    // 检查嵌套深度
    const depth = getObjectDepth(query)
    if (depth > 5) {
      score += 3
      issues.push(`查询嵌套深度过深 (${depth} 层)`)
    }

    // 检查布尔查询条件数量
    const boolConditions = countBoolConditions(query)
    if (boolConditions > 10) {
      score += 2
      issues.push(`布尔查询条件过多 (${boolConditions} 个)`)
    }

    // 检查通配符查询
    if (hasWildcardQueries(query)) {
      score += 2
      issues.push('包含通配符查询')
    }

    // 检查正则表达式查询
    if (hasRegexpQueries(query)) {
      score += 3
      issues.push('包含正则表达式查询')
    }

    // 检查范围查询
    const rangeQueries = countRangeQueries(query)
    if (rangeQueries > 5) {
      score += 1
      issues.push(`范围查询过多 (${rangeQueries} 个)`)
    }

    description = issues.join(', ')

    return { score, description }
  }

  // 工具函数
  const getObjectDepth = (obj: any): number => {
    if (typeof obj !== 'object' || obj === null) return 0
    
    let maxDepth = 0
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const depth = getObjectDepth(obj[key])
        maxDepth = Math.max(maxDepth, depth)
      }
    }
    return maxDepth + 1
  }

  const countBoolConditions = (obj: any): number => {
    if (typeof obj !== 'object' || obj === null) return 0
    
    let count = 0
    for (const key in obj) {
      if (key === 'bool' && typeof obj[key] === 'object') {
        const boolObj = obj[key]
        if (boolObj.must) count += Array.isArray(boolObj.must) ? boolObj.must.length : 1
        if (boolObj.should) count += Array.isArray(boolObj.should) ? boolObj.should.length : 1
        if (boolObj.must_not) count += Array.isArray(boolObj.must_not) ? boolObj.must_not.length : 1
        if (boolObj.filter) count += Array.isArray(boolObj.filter) ? boolObj.filter.length : 1
      }
      count += countBoolConditions(obj[key])
    }
    return count
  }

  const hasWildcardQueries = (obj: any): boolean => {
    if (typeof obj !== 'object' || obj === null) return false
    
    for (const key in obj) {
      if (key === 'wildcard') return true
      if (hasWildcardQueries(obj[key])) return true
    }
    return false
  }

  const hasRegexpQueries = (obj: any): boolean => {
    if (typeof obj !== 'object' || obj === null) return false
    
    for (const key in obj) {
      if (key === 'regexp') return true
      if (hasRegexpQueries(obj[key])) return true
    }
    return false
  }

  const countRangeQueries = (obj: any): number => {
    if (typeof obj !== 'object' || obj === null) return 0
    
    let count = 0
    for (const key in obj) {
      if (key === 'range') count++
      count += countRangeQueries(obj[key])
    }
    return count
  }

  // 获取性能统计
  const getPerformanceStats = () => {
    const recent = performanceHistory.value.slice(0, 100)
    
    if (recent.length === 0) {
      return {
        totalQueries: 0,
        avgExecutionTime: 0,
        slowQueries: 0,
        fastQueries: 0,
        avgResultCount: 0
      }
    }

    const totalExecutionTime = recent.reduce((sum, m) => sum + m.executionTimeMs, 0)
    const slowQueries = recent.filter(m => m.executionTimeMs > slowQueryThreshold.value)
    const totalResultCount = recent.reduce((sum, m) => sum + m.resultCount, 0)

    return {
      totalQueries: recent.length,
      avgExecutionTime: totalExecutionTime / recent.length,
      slowQueries: slowQueries.length,
      fastQueries: recent.length - slowQueries.length,
      avgResultCount: totalResultCount / recent.length
    }
  }

  // 保存到本地存储
  const saveToStorage = () => {
    try {
      localStorage.setItem('es-client-performance-history', JSON.stringify(performanceHistory.value.slice(0, 100)))
      localStorage.setItem('es-client-performance-analyses', JSON.stringify(analyses.value.slice(0, 50)))
    } catch (error) {
      console.error('Failed to save performance data:', error)
    }
  }

  // 从本地存储加载
  const loadFromStorage = () => {
    try {
      const historyData = localStorage.getItem('es-client-performance-history')
      if (historyData) {
        performanceHistory.value = JSON.parse(historyData)
      }

      const analysesData = localStorage.getItem('es-client-performance-analyses')
      if (analysesData) {
        analyses.value = JSON.parse(analysesData)
      }
    } catch (error) {
      console.error('Failed to load performance data:', error)
    }
  }

  // 清除历史记录
  const clearHistory = () => {
    performanceHistory.value = []
    analyses.value = []
    saveToStorage()
  }

  // 初始化时加载数据
  loadFromStorage()

  return {
    performanceHistory,
    analyses,
    slowQueryThreshold,
    recordQueryPerformance,
    analyzeQueryPerformance,
    getPerformanceStats,
    clearHistory,
    loadFromStorage
  }
})