import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IndexInfo } from '../types'
import { Api } from '../api'
import { useErrorHandler } from '../utils/enhancedErrorHandler'

export const useIndexStore = defineStore('index', () => {
  const { handleError, showError, showSuccess, handleAsync } = useErrorHandler()
  const indices = ref<IndexInfo[]>([])
  const loading = ref(false)
  const selectedIndex = ref<string>('')

  // 获取索引列表
  const fetchIndices = async (connectionId: string) => {
    if (!connectionId) {
      showError('请先选择连接')
      return
    }

    return handleAsync(
      async () => {
        const result = await Api.listIndices(connectionId)
        indices.value = result
        return result
      },
      {
        loadingMessage: '正在获取索引列表...',
        errorOptions: {
          title: '获取索引列表失败',
          showRetry: true,
          onRetry: () => fetchIndices(connectionId)
        }
      }
    )
  }

  // 创建索引
  const createIndex = async (connectionId: string, indexName: string, mapping?: any) => {
    return handleAsync(
      async () => {
        await Api.createIndex(connectionId, indexName, mapping)
        await fetchIndices(connectionId) // 重新加载列表
        return true
      },
      {
        loadingMessage: `正在创建索引 "${indexName}"...`,
        successMessage: `索引 "${indexName}" 创建成功`,
        errorOptions: {
          title: '创建索引失败',
          showRetry: true,
          onRetry: () => createIndex(connectionId, indexName, mapping)
        }
      }
    )
  }

  // 删除索引
  const deleteIndex = async (connectionId: string, indexName: string) => {
    return handleAsync(
      async () => {
        await Api.deleteIndex(connectionId, indexName)
        await fetchIndices(connectionId) // 重新加载列表
        return true
      },
      {
        loadingMessage: `正在删除索引 "${indexName}"...`,
        successMessage: `索引 "${indexName}" 删除成功`,
        errorOptions: {
          title: '删除索引失败',
          showRetry: true,
          onRetry: () => deleteIndex(connectionId, indexName)
        }
      }
    )
  }

  // 获取索引映射
  const getIndexMapping = async (connectionId: string, indexName: string) => {
    return handleAsync(
      async () => {
        return await Api.getIndexMapping(connectionId, indexName)
      },
      {
        loadingMessage: `正在获取索引 "${indexName}" 的映射...`,
        errorOptions: {
          title: '获取索引映射失败',
          showRetry: true,
          onRetry: () => getIndexMapping(connectionId, indexName)
        }
      }
    )
  }

  // loadIndices 是 fetchIndices 的别名，保持兼容性
  const loadIndices = fetchIndices

  return {
    indices,
    loading,
    selectedIndex,
    fetchIndices,
    loadIndices,
    createIndex,
    deleteIndex,
    getIndexMapping
  }
})