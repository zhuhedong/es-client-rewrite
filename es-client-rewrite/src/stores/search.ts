import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchQuery, SearchResult } from '../types'
import { Api } from '../api'
import { Message } from '@arco-design/web-vue'

export const useSearchStore = defineStore('search', () => {
  const searchResult = ref<SearchResult | null>(null)
  const loading = ref(false)
  const query = ref<SearchQuery>({
    index: '',
    query: { match_all: {} },
    from: 0,
    size: 10
  })

  // 执行搜索
  const executeSearch = async (connectionId: string, searchQuery: SearchQuery) => {
    if (!connectionId) return

    try {
      loading.value = true
      searchResult.value = await Api.searchDocuments(connectionId, searchQuery)
    } catch (error) {
      console.error('Search failed:', error)
      Message.error('搜索执行失败')
    } finally {
      loading.value = false
    }
  }

  // 重置搜索结果
  const resetSearchResult = () => {
    searchResult.value = null
  }

  // 更新查询条件
  const updateQuery = (newQuery: Partial<SearchQuery>) => {
    query.value = { ...query.value, ...newQuery }
  }

  return {
    searchResult,
    loading,
    query,
    executeSearch,
    resetSearchResult,
    updateQuery
  }
})