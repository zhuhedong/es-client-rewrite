import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EsConnection } from '../types'
import { Api } from '../api'
import { Message } from '@arco-design/web-vue'

export const useConnectionStore = defineStore('connection', () => {
  const connections = ref<EsConnection[]>([])
  const currentConnectionId = ref<string>('')
  const loading = ref(false)

  const currentConnection = computed(() => {
    return connections.value.find(conn => conn.id === currentConnectionId.value)
  })

  // 加载所有连接
  const loadConnections = async () => {
    try {
      loading.value = true
      connections.value = await Api.listConnections()
    } catch (error) {
      console.error('Failed to load connections:', error)
      Message.error('加载连接失败')
    } finally {
      loading.value = false
    }
  }

  // 添加连接
  const addConnection = async (connection: EsConnection) => {
    try {
      loading.value = true
      const id = await Api.addConnection(connection)
      await loadConnections() // 重新加载列表
      Message.success('连接添加成功')
      return id
    } catch (error) {
      console.error('Failed to add connection:', error)
      Message.error('添加连接失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 移除连接
  const removeConnection = async (id: string) => {
    try {
      loading.value = true
      const success = await Api.removeConnection(id)
      if (success) {
        await loadConnections()
        if (currentConnectionId.value === id) {
          currentConnectionId.value = ''
        }
        Message.success('连接删除成功')
      }
      return success
    } catch (error) {
      console.error('Failed to remove connection:', error)
      Message.error('删除连接失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 测试连接
  const testConnection = async (connectionId: string) => {
    try {
      const result = await Api.testConnection(connectionId)
      Message.success('连接测试成功')
      return result
    } catch (error) {
      console.error('Connection test failed:', error)
      Message.error('连接测试失败')
      throw error
    }
  }

  // 设置当前连接
  const setCurrentConnection = (id: string) => {
    currentConnectionId.value = id
  }

  return {
    connections,
    currentConnectionId,
    currentConnection,
    loading,
    loadConnections,
    addConnection,
    removeConnection,
    testConnection,
    setCurrentConnection
  }
})