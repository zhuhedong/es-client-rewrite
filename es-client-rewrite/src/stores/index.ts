import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IndexInfo } from '../types'
import { Api } from '../api'
import { Message } from '@arco-design/web-vue'

export const useIndexStore = defineStore('index', () => {
  const indices = ref<IndexInfo[]>([])
  const loading = ref(false)
  const selectedIndex = ref<string>('')

  // 获取索引列表
  const fetchIndices = async (connectionId: string) => {
    if (!connectionId) return

    try {
      loading.value = true
      indices.value = await Api.listIndices(connectionId)
    } catch (error) {
      console.error('Failed to fetch indices:', error)
      Message.error('获取索引列表失败')
    } finally {
      loading.value = false
    }
  }

  // 创建索引
  const createIndex = async (connectionId: string, indexName: string, mapping?: any) => {
    try {
      loading.value = true
      await Api.createIndex(connectionId, indexName, mapping)
      await fetchIndices(connectionId) // 重新加载列表
      Message.success('索引创建成功')
    } catch (error) {
      console.error('Failed to create index:', error)
      Message.error('创建索引失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 删除索引
  const deleteIndex = async (connectionId: string, indexName: string) => {
    try {
      loading.value = true
      await Api.deleteIndex(connectionId, indexName)
      await fetchIndices(connectionId) // 重新加载列表
      Message.success('索引删除成功')
    } catch (error) {
      console.error('Failed to delete index:', error)
      Message.error('删除索引失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取索引映射
  const getIndexMapping = async (connectionId: string, indexName: string) => {
    try {
      const mapping = await Api.getIndexMapping(connectionId, indexName)
      return mapping
    } catch (error) {
      console.error('Failed to get index mapping:', error)
      Message.error('获取索引映射失败')
      throw error
    }
  }

  return {
    indices,
    loading,
    selectedIndex,
    fetchIndices,
    createIndex,
    deleteIndex,
    getIndexMapping
  }
})