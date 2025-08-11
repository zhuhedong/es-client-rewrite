import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchQuery, SearchResult } from '../types'
import { Api } from '../api'
import { useErrorHandler } from '../utils/enhancedErrorHandler'
import { useQueryHistoryStore } from './queryHistory'

export const useSearchStore = defineStore('search', () => {
  const { handleError, showError } = useErrorHandler()
  const searchResult = ref<SearchResult | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const query = ref<SearchQuery>({
    index: '',
    query: { match_all: {} },
    from: 0,
    size: 10
  })
  const lastQuery = ref<SearchQuery | null>(null)
  // 缓存的搜索结果页面
  const cachedPages = ref<Map<string, SearchResult>>(new Map())
  const maxCacheSize = 50 // 最多缓存50页

  // 生成缓存键
  const generateCacheKey = (searchQuery: SearchQuery, connectionId: string) => {
    return JSON.stringify({
      connectionId,
      index: searchQuery.index,
      query: searchQuery.query,
      sort: searchQuery.sort,
      from: searchQuery.from,
      size: searchQuery.size
    })
  }

  // 清理缓存
  const cleanCache = () => {
    if (cachedPages.value.size > maxCacheSize) {
      const entries = Array.from(cachedPages.value.entries())
      const toDelete = entries.slice(0, entries.length - maxCacheSize)
      toDelete.forEach(([key]) => cachedPages.value.delete(key))
    }
  }

  // 执行搜索
  const executeSearch = async (connectionId: string, searchQuery: SearchQuery, useCache = true) => {
    if (!connectionId) {
      showError('请先选择连接')
      return
    }

    try {
      const cacheKey = generateCacheKey(searchQuery, connectionId)
      
      // 检查缓存
      if (useCache && cachedPages.value.has(cacheKey)) {
        searchResult.value = cachedPages.value.get(cacheKey)!
        lastQuery.value = { ...searchQuery }
        return
      }

      loading.value = true
      const startTime = Date.now()
      lastQuery.value = { ...searchQuery }
      searchResult.value = await Api.searchDocuments(connectionId, searchQuery)
      
      // 缓存结果
      if (searchResult.value) {
        cachedPages.value.set(cacheKey, searchResult.value)
        cleanCache()
      }
      
      // 记录查询历史
      const executionTime = Date.now() - startTime
      const resultCount = typeof searchResult.value?.hits === 'object' && searchResult.value.hits !== null && 'total' in searchResult.value.hits 
        ? (searchResult.value.hits as any).total 
        : Array.isArray(searchResult.value?.hits) ? searchResult.value.hits.length : 0
      const queryHistoryStore = useQueryHistoryStore()
      queryHistoryStore.addToHistory(searchQuery, connectionId, executionTime, resultCount)
      
    } catch (error) {
      handleError(error, {
        title: '搜索失败',
        showRetry: true,
        onRetry: () => executeSearch(connectionId, searchQuery, false)
      })
    } finally {
      loading.value = false
    }
  }

  // 重置搜索结果
  const resetSearchResult = () => {
    searchResult.value = null
    cachedPages.value.clear()
  }

  // 更新查询条件
  const updateQuery = (newQuery: Partial<SearchQuery>) => {
    query.value = { ...query.value, ...newQuery }
  }

  // 分页导航方法
  const goToPage = async (connectionId: string, page: number, pageSize?: number) => {
    if (!lastQuery.value) return
    
    const newSize = pageSize || lastQuery.value.size || 10
    const newFrom = (page - 1) * newSize
    
    const searchQuery: SearchQuery = {
      ...lastQuery.value,
      from: newFrom,
      size: newSize
    }
    
    await executeSearch(connectionId, searchQuery)
  }

  // 预加载下一页（后台静默加载）
  const preloadNextPage = async (connectionId: string) => {
    if (!lastQuery.value || !searchResult.value) return
    
    const currentPage = Math.floor((lastQuery.value.from || 0) / (lastQuery.value.size || 10)) + 1
    const nextPage = currentPage + 1
    const nextFrom = (nextPage - 1) * (lastQuery.value.size || 10)
    
    // 检查是否还有下一页
    if (nextFrom >= (searchResult.value.total || 0)) return
    
    const nextPageQuery: SearchQuery = {
      ...lastQuery.value,
      from: nextFrom
    }
    
    const cacheKey = generateCacheKey(nextPageQuery, connectionId)
    if (cachedPages.value.has(cacheKey)) return // 已缓存
    
    try {
      const result = await Api.searchDocuments(connectionId, nextPageQuery)
      if (result) {
        cachedPages.value.set(cacheKey, result)
        cleanCache()
      }
    } catch (error) {
      // 预加载失败不显示错误消息
      console.warn('Preload next page failed:', error)
    }
  }

  return {
    searchResult,
    loading,
    loadingMore,
    query,
    lastQuery,
    cachedPages,
    executeSearch,
    resetSearchResult,
    updateQuery,
    goToPage,
    preloadNextPage
  }
})