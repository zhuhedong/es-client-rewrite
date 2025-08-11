import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchQuery } from '../types'

export interface QueryHistoryItem {
  id: string
  name?: string
  query: SearchQuery
  connectionId: string
  timestamp: number
  executionTime?: number
  resultCount?: number
}

export const useQueryHistoryStore = defineStore('queryHistory', () => {
  const history = ref<QueryHistoryItem[]>([])
  const favorites = ref<QueryHistoryItem[]>([])

  // 从 localStorage 加载历史记录
  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('es-client-query-history')
      if (saved) {
        history.value = JSON.parse(saved)
      }
      
      const savedFavorites = localStorage.getItem('es-client-query-favorites')
      if (savedFavorites) {
        favorites.value = JSON.parse(savedFavorites)
      }
    } catch (error) {
      console.error('Failed to load query history:', error)
    }
  }

  // 保存历史记录到 localStorage
  const saveHistory = () => {
    try {
      localStorage.setItem('es-client-query-history', JSON.stringify(history.value))
      localStorage.setItem('es-client-query-favorites', JSON.stringify(favorites.value))
    } catch (error) {
      console.error('Failed to save query history:', error)
    }
  }

  // 添加查询到历史记录
  const addToHistory = (query: SearchQuery, connectionId: string, executionTime?: number, resultCount?: number) => {
    const historyItem: QueryHistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      query: { ...query },
      connectionId,
      timestamp: Date.now(),
      executionTime,
      resultCount
    }

    // 检查是否已存在相同查询
    const existingIndex = history.value.findIndex(item => 
      JSON.stringify(item.query) === JSON.stringify(query) && 
      item.connectionId === connectionId
    )

    if (existingIndex !== -1) {
      // 更新现有记录
      history.value[existingIndex] = historyItem
    } else {
      // 添加新记录
      history.value.unshift(historyItem)
    }

    // 限制历史记录数量（保留最近100条）
    if (history.value.length > 100) {
      history.value = history.value.slice(0, 100)
    }

    saveHistory()
  }

  // 删除历史记录项
  const removeHistoryItem = (id: string) => {
    history.value = history.value.filter(item => item.id !== id)
    saveHistory()
  }

  // 清空历史记录
  const clearHistory = () => {
    history.value = []
    saveHistory()
  }

  // 添加到收藏
  const addToFavorites = (historyItem: QueryHistoryItem, name?: string) => {
    const favoriteItem = { 
      ...historyItem, 
      name: name || `查询 ${new Date(historyItem.timestamp).toLocaleString()}`,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }
    
    favorites.value.unshift(favoriteItem)
    saveHistory()
  }

  // 从收藏中移除
  const removeFromFavorites = (id: string) => {
    favorites.value = favorites.value.filter(item => item.id !== id)
    saveHistory()
  }

  // 更新收藏项名称
  const updateFavoriteName = (id: string, name: string) => {
    const item = favorites.value.find(f => f.id === id)
    if (item) {
      item.name = name
      saveHistory()
    }
  }

  // 获取特定连接的历史记录
  const getHistoryForConnection = (connectionId: string) => {
    return history.value.filter(item => item.connectionId === connectionId)
  }

  // 搜索历史记录
  const searchHistory = (keyword: string) => {
    const lowerKeyword = keyword.toLowerCase()
    return history.value.filter(item => 
      JSON.stringify(item.query).toLowerCase().includes(lowerKeyword) ||
      (item.name && item.name.toLowerCase().includes(lowerKeyword))
    )
  }

  // 初始化时加载数据
  loadHistory()

  return {
    history,
    favorites,
    addToHistory,
    removeHistoryItem,
    clearHistory,
    addToFavorites,
    removeFromFavorites,
    updateFavoriteName,
    getHistoryForConnection,
    searchHistory,
    loadHistory
  }
})