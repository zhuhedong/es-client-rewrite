import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SearchQuery } from '../types'

export interface SlowQueryLog {
  queryId: string
  connectionId: string
  index: string
  query: any
  executionTimeMs: number
  timestamp: number
  resultCount: number
  thresholdMs: number
  nodeId?: string
  userAgent?: string
}

export interface SlowQueryStats {
  totalSlowQueries: number
  avgExecutionTime: number
  maxExecutionTime: number
  minExecutionTime: number
  recentTrend: 'increasing' | 'decreasing' | 'stable'
}

export const useSlowQueryStore = defineStore('slowQuery', () => {
  const slowQueries = ref<SlowQueryLog[]>([])
  const threshold = ref(1000) // 默认1秒阈值
  const maxLogSize = ref(1000) // 最大日志条数
  const autoCleanup = ref(true) // 自动清理旧日志

  // 记录慢查询
  const logSlowQuery = (
    query: SearchQuery,
    connectionId: string,
    executionTime: number,
    resultCount: number,
    nodeId?: string
  ) => {
    if (executionTime < threshold.value) return

    const slowQuery: SlowQueryLog = {
      queryId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      connectionId,
      index: query.index,
      query: query.query,
      executionTimeMs: executionTime,
      timestamp: Date.now(),
      resultCount,
      thresholdMs: threshold.value,
      nodeId,
      userAgent: navigator.userAgent
    }

    slowQueries.value.unshift(slowQuery)

    // 限制日志大小
    if (slowQueries.value.length > maxLogSize.value) {
      slowQueries.value = slowQueries.value.slice(0, maxLogSize.value)
    }

    // 自动清理超过30天的日志
    if (autoCleanup.value) {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      slowQueries.value = slowQueries.value.filter(q => q.timestamp > thirtyDaysAgo)
    }

    saveToStorage()
  }

  // 获取慢查询统计信息
  const getSlowQueryStats = (): SlowQueryStats => {
    if (slowQueries.value.length === 0) {
      return {
        totalSlowQueries: 0,
        avgExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: 0,
        recentTrend: 'stable'
      }
    }

    const executionTimes = slowQueries.value.map(q => q.executionTimeMs)
    const totalTime = executionTimes.reduce((sum, time) => sum + time, 0)
    
    // 计算趋势（比较最近10条和之前10条的平均时间）
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (slowQueries.value.length >= 20) {
      const recent10 = slowQueries.value.slice(0, 10)
      const previous10 = slowQueries.value.slice(10, 20)
      
      const recentAvg = recent10.reduce((sum, q) => sum + q.executionTimeMs, 0) / 10
      const previousAvg = previous10.reduce((sum, q) => sum + q.executionTimeMs, 0) / 10
      
      const difference = Math.abs(recentAvg - previousAvg)
      const threshold = previousAvg * 0.1 // 10% 变化阈值
      
      if (difference > threshold) {
        trend = recentAvg > previousAvg ? 'increasing' : 'decreasing'
      }
    }

    return {
      totalSlowQueries: slowQueries.value.length,
      avgExecutionTime: totalTime / slowQueries.value.length,
      maxExecutionTime: Math.max(...executionTimes),
      minExecutionTime: Math.min(...executionTimes),
      recentTrend: trend
    }
  }

  // 按连接分组慢查询
  const getSlowQueriesByConnection = () => {
    const grouped = slowQueries.value.reduce((acc, query) => {
      if (!acc[query.connectionId]) {
        acc[query.connectionId] = []
      }
      acc[query.connectionId].push(query)
      return acc
    }, {} as Record<string, SlowQueryLog[]>)

    return Object.entries(grouped).map(([connectionId, queries]) => ({
      connectionId,
      count: queries.length,
      avgTime: queries.reduce((sum, q) => sum + q.executionTimeMs, 0) / queries.length,
      queries
    }))
  }

  // 按索引分组慢查询
  const getSlowQueriesByIndex = () => {
    const grouped = slowQueries.value.reduce((acc, query) => {
      if (!acc[query.index]) {
        acc[query.index] = []
      }
      acc[query.index].push(query)
      return acc
    }, {} as Record<string, SlowQueryLog[]>)

    return Object.entries(grouped).map(([index, queries]) => ({
      index,
      count: queries.length,
      avgTime: queries.reduce((sum, q) => sum + q.executionTimeMs, 0) / queries.length,
      queries
    }))
  }

  // 获取时间分布（按小时统计）
  const getTimeDistribution = () => {
    const distribution: Record<string, number> = {}
    
    slowQueries.value.forEach(query => {
      const hour = new Date(query.timestamp).getHours()
      const key = `${hour}:00`
      distribution[key] = (distribution[key] || 0) + 1
    })

    return Object.entries(distribution)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
  }

  // 查找相似查询
  const findSimilarQueries = (targetQuery: any) => {
    const queryString = JSON.stringify(targetQuery)
    const similar = slowQueries.value.filter(q => {
      const similarity = calculateQuerySimilarity(queryString, JSON.stringify(q.query))
      return similarity > 0.8 // 80% 相似度
    })

    return similar.slice(0, 10) // 返回最多10个相似查询
  }

  // 计算查询相似度
  const calculateQuerySimilarity = (query1: string, query2: string): number => {
    if (query1 === query2) return 1

    // 简单的字符串相似度计算（可以改进为更复杂的算法）
    const len1 = query1.length
    const len2 = query2.length
    const maxLen = Math.max(len1, len2)
    
    if (maxLen === 0) return 1
    
    const distance = levenshteinDistance(query1, query2)
    return (maxLen - distance) / maxLen
  }

  // Levenshtein距离算法
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  // 清理指定时间之前的日志
  const clearLogsBefore = (timestamp: number) => {
    slowQueries.value = slowQueries.value.filter(q => q.timestamp > timestamp)
    saveToStorage()
  }

  // 清理所有日志
  const clearAllLogs = () => {
    slowQueries.value = []
    saveToStorage()
  }

  // 删除特定慢查询
  const removeSlowQuery = (queryId: string) => {
    slowQueries.value = slowQueries.value.filter(q => q.queryId !== queryId)
    saveToStorage()
  }

  // 导出慢查询日志
  const exportLogs = (format: 'json' | 'csv' = 'json') => {
    if (format === 'json') {
      return JSON.stringify(slowQueries.value, null, 2)
    } else if (format === 'csv') {
      const headers = ['时间', '索引', '执行时间(ms)', '结果数', '查询']
      const rows = slowQueries.value.map(q => [
        new Date(q.timestamp).toISOString(),
        q.index,
        q.executionTimeMs,
        q.resultCount,
        JSON.stringify(q.query).replace(/"/g, '""') // CSV转义
      ])
      
      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }
    
    return ''
  }

  // 保存到本地存储
  const saveToStorage = () => {
    try {
      localStorage.setItem('es-client-slow-queries', JSON.stringify({
        queries: slowQueries.value.slice(0, 500), // 只保存最近500条
        threshold: threshold.value,
        maxLogSize: maxLogSize.value,
        autoCleanup: autoCleanup.value
      }))
    } catch (error) {
      console.error('Failed to save slow query logs:', error)
    }
  }

  // 从本地存储加载
  const loadFromStorage = () => {
    try {
      const data = localStorage.getItem('es-client-slow-queries')
      if (data) {
        const parsed = JSON.parse(data)
        slowQueries.value = parsed.queries || []
        threshold.value = parsed.threshold || 1000
        maxLogSize.value = parsed.maxLogSize || 1000
        autoCleanup.value = parsed.autoCleanup !== false
      }
    } catch (error) {
      console.error('Failed to load slow query logs:', error)
    }
  }

  // 计算属性
  const recentSlowQueries = computed(() => 
    slowQueries.value.slice(0, 20)
  )

  const slowQueryCount = computed(() => slowQueries.value.length)

  // 初始化时加载数据
  loadFromStorage()

  return {
    slowQueries,
    threshold,
    maxLogSize,
    autoCleanup,
    recentSlowQueries,
    slowQueryCount,
    logSlowQuery,
    getSlowQueryStats,
    getSlowQueriesByConnection,
    getSlowQueriesByIndex,
    getTimeDistribution,
    findSimilarQueries,
    clearLogsBefore,
    clearAllLogs,
    removeSlowQuery,
    exportLogs,
    saveToStorage,
    loadFromStorage
  }
})