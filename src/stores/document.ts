import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocumentRequest, DocumentResponse, GetDocumentResponse, BulkRequest, BulkResponse } from '../types'
import { Api } from '../api'
import { Message } from '@arco-design/web-vue'

export const useDocumentStore = defineStore('document', () => {
  const loading = ref(false)
  const currentDocument = ref<GetDocumentResponse | null>(null)
  
  // 创建文档
  const createDocument = async (connectionId: string, request: DocumentRequest): Promise<DocumentResponse | null> => {
    if (!connectionId) return null

    try {
      loading.value = true
      const response = await Api.createDocument(connectionId, request)
      Message.success(`文档创建成功: ${response.result}`)
      return response
    } catch (error) {
      console.error('Create document failed:', error)
      Message.error(`文档创建失败: ${error}`)
      return null
    } finally {
      loading.value = false
    }
  }

  // 更新文档
  const updateDocument = async (connectionId: string, request: DocumentRequest): Promise<DocumentResponse | null> => {
    if (!connectionId) return null

    try {
      loading.value = true
      const response = await Api.updateDocument(connectionId, request)
      Message.success(`文档更新成功: ${response.result}`)
      return response
    } catch (error) {
      console.error('Update document failed:', error)
      Message.error(`文档更新失败: ${error}`)
      return null
    } finally {
      loading.value = false
    }
  }

  // 获取文档
  const getDocument = async (connectionId: string, index: string, id: string): Promise<GetDocumentResponse | null> => {
    if (!connectionId) return null

    try {
      loading.value = true
      const response = await Api.getDocument(connectionId, index, id)
      currentDocument.value = response
      if (!response.found) {
        Message.warning('文档不存在')
      }
      return response
    } catch (error) {
      console.error('Get document failed:', error)
      Message.error(`获取文档失败: ${error}`)
      return null
    } finally {
      loading.value = false
    }
  }

  // 删除文档
  const deleteDocument = async (connectionId: string, index: string, id: string): Promise<DocumentResponse | null> => {
    if (!connectionId) return null

    try {
      loading.value = true
      const response = await Api.deleteDocument(connectionId, index, id)
      Message.success(`文档删除成功: ${response.result}`)
      return response
    } catch (error) {
      console.error('Delete document failed:', error)
      Message.error(`文档删除失败: ${error}`)
      return null
    } finally {
      loading.value = false
    }
  }

  // 清空当前文档
  const clearCurrentDocument = () => {
    currentDocument.value = null
  }

  // 批量操作
  const bulkOperations = async (connectionId: string, request: BulkRequest): Promise<BulkResponse | null> => {
    if (!connectionId) return null

    try {
      loading.value = true
      const response = await Api.bulkOperations(connectionId, request)
      
      if (response.errors) {
        const errorCount = response.items.filter(item => 
          Object.values(item)[0] && (Object.values(item)[0] as any).error
        ).length
        Message.warning(`批量操作完成，但有 ${errorCount} 个操作失败`)
      } else {
        Message.success(`批量操作成功完成，处理了 ${response.items.length} 个操作`)
      }
      
      return response
    } catch (error) {
      console.error('Bulk operations failed:', error)
      Message.error(`批量操作失败: ${error}`)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    currentDocument,
    createDocument,
    updateDocument,
    getDocument,
    deleteDocument,
    clearCurrentDocument,
    bulkOperations
  }
})