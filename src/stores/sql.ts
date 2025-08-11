import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SqlQuery, SqlResult } from '../types'
import { Api } from '../api'
import { Message } from '@arco-design/web-vue'

export const useSqlStore = defineStore('sql', () => {
  const sqlResult = ref<SqlResult | null>(null)
  const loading = ref(false)
  const query = ref<SqlQuery>({
    query: '',
    fetch_size: 1000,
    request_timeout: '30s',
    page_timeout: '45s'
  })
  const currentCursor = ref<string | null>(null)
  const allRows = ref<any[][]>([])
  const totalFetched = ref(0)

  // 执行 SQL 查询
  const executeSql = async (connectionId: string, sqlQuery: SqlQuery) => {
    if (!connectionId || !sqlQuery.query.trim()) return

    try {
      loading.value = true
      sqlResult.value = await Api.executeSql(connectionId, sqlQuery)
      
      // 重置状态
      allRows.value = [...(sqlResult.value?.rows || [])]
      totalFetched.value = sqlResult.value?.rows?.length || 0
      currentCursor.value = sqlResult.value?.cursor ?? null
      
      Message.success(`查询成功，获取 ${sqlResult.value?.rows?.length || 0} 行数据`)
    } catch (error) {
      console.error('SQL query failed:', error)
      Message.error('SQL 查询执行失败')
    } finally {
      loading.value = false
    }
  }

  // 获取更多数据（使用游标）
  const fetchMore = async (connectionId: string) => {
    if (!currentCursor.value || loading.value) return

    try {
      loading.value = true
      const result = await Api.executeSqlCursor(connectionId, currentCursor.value)
      
      // 合并数据
      allRows.value.push(...result.rows)
      totalFetched.value += result.rows.length
      currentCursor.value = result.cursor || null
      
      // 更新结果（保持列信息不变，只更新行数据）
      if (sqlResult.value) {
        sqlResult.value.rows = allRows.value
        sqlResult.value.cursor = currentCursor.value || undefined
      }
      
      Message.success(`获取了额外 ${result.rows.length} 行数据`)
    } catch (error) {
      console.error('Failed to fetch more data:', error)
      Message.error('获取更多数据失败')
    } finally {
      loading.value = false
    }
  }

  // 关闭游标
  const closeCursor = async (connectionId: string) => {
    if (!currentCursor.value) return

    try {
      await Api.closeSqlCursor(connectionId, currentCursor.value)
      currentCursor.value = null
    } catch (error) {
      console.error('Failed to close cursor:', error)
    }
  }

  // 重置 SQL 结果
  const resetSqlResult = () => {
    sqlResult.value = null
    allRows.value = []
    totalFetched.value = 0
    currentCursor.value = null
  }

  // 更新查询条件
  const updateQuery = (newQuery: Partial<SqlQuery>) => {
    query.value = { ...query.value, ...newQuery }
  }

  // 预设查询示例
  const sampleQueries = [
    {
      name: '查询所有数据',
      query: 'SELECT * FROM "{index}" LIMIT 100'
    },
    {
      name: '按字段分组统计',
      query: 'SELECT {field}, COUNT(*) as count FROM "{index}" GROUP BY {field} ORDER BY count DESC'
    },
    {
      name: '时间范围查询',
      query: 'SELECT * FROM "{index}" WHERE {timestamp_field} >= \'2023-01-01\' AND {timestamp_field} < \'2024-01-01\''
    },
    {
      name: '聚合统计',
      query: 'SELECT AVG({numeric_field}), MAX({numeric_field}), MIN({numeric_field}) FROM "{index}"'
    },
    {
      name: '条件筛选',
      query: 'SELECT * FROM "{index}" WHERE {text_field} LIKE \'%keyword%\' ORDER BY {timestamp_field} DESC LIMIT 50'
    }
  ]

  return {
    sqlResult,
    loading,
    query,
    currentCursor,
    allRows,
    totalFetched,
    executeSql,
    fetchMore,
    closeCursor,
    resetSqlResult,
    updateQuery,
    sampleQueries
  }
})