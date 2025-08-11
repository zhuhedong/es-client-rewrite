import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IndexSettings, AliasRequest } from '../types'
import { Api } from '../api'
import { Message } from '@arco-design/web-vue'

export const useIndexSettingsStore = defineStore('indexSettings', () => {
  const loading = ref(false)
  const settings = ref<any>(null)
  const aliases = ref<any>(null)
  
  // 获取索引设置
  const getIndexSettings = async (connectionId: string, index: string): Promise<any> => {
    if (!connectionId) return null

    try {
      loading.value = true
      const response = await Api.getIndexSettings(connectionId, index)
      settings.value = response
      return response
    } catch (error) {
      console.error('Get index settings failed:', error)
      Message.error(`获取索引设置失败: ${error}`)
      return null
    } finally {
      loading.value = false
    }
  }

  // 更新索引设置
  const updateIndexSettings = async (connectionId: string, index: string, newSettings: IndexSettings): Promise<boolean> => {
    if (!connectionId) return false

    try {
      loading.value = true
      await Api.updateIndexSettings(connectionId, index, newSettings)
      Message.success('索引设置更新成功')
      
      // 重新获取最新设置
      await getIndexSettings(connectionId, index)
      return true
    } catch (error) {
      console.error('Update index settings failed:', error)
      Message.error(`更新索引设置失败: ${error}`)
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取所有别名
  const getAllAliases = async (connectionId: string): Promise<any> => {
    if (!connectionId) return null

    try {
      loading.value = true
      const response = await Api.getAliases(connectionId)
      aliases.value = response
      return response
    } catch (error) {
      console.error('Get aliases failed:', error)
      Message.error(`获取别名失败: ${error}`)
      return null
    } finally {
      loading.value = false
    }
  }

  // 获取特定索引的别名
  const getIndexAliases = async (connectionId: string, index: string): Promise<any> => {
    if (!connectionId) return null

    try {
      loading.value = true
      const response = await Api.getIndexAliases(connectionId, index)
      return response
    } catch (error) {
      console.error('Get index aliases failed:', error)
      Message.error(`获取索引别名失败: ${error}`)
      return null
    } finally {
      loading.value = false
    }
  }

  // 批量管理别名
  const manageAliases = async (connectionId: string, request: AliasRequest): Promise<boolean> => {
    if (!connectionId) return false

    try {
      loading.value = true
      await Api.manageAliases(connectionId, request)
      Message.success('别名操作成功')
      
      // 重新获取别名列表
      await getAllAliases(connectionId)
      return true
    } catch (error) {
      console.error('Manage aliases failed:', error)
      Message.error(`别名操作失败: ${error}`)
      return false
    } finally {
      loading.value = false
    }
  }

  // 添加单个别名
  const addAlias = async (connectionId: string, index: string, alias: string, filter?: any, routing?: string): Promise<boolean> => {
    if (!connectionId) return false

    try {
      loading.value = true
      await Api.addAlias(connectionId, index, alias, filter, routing)
      Message.success(`别名 '${alias}' 添加成功`)
      
      // 重新获取别名列表
      await getAllAliases(connectionId)
      return true
    } catch (error) {
      console.error('Add alias failed:', error)
      Message.error(`添加别名失败: ${error}`)
      return false
    } finally {
      loading.value = false
    }
  }

  // 删除别名
  const removeAlias = async (connectionId: string, index: string, alias: string): Promise<boolean> => {
    if (!connectionId) return false

    try {
      loading.value = true
      await Api.removeAlias(connectionId, index, alias)
      Message.success(`别名 '${alias}' 删除成功`)
      
      // 重新获取别名列表
      await getAllAliases(connectionId)
      return true
    } catch (error) {
      console.error('Remove alias failed:', error)
      Message.error(`删除别名失败: ${error}`)
      return false
    } finally {
      loading.value = false
    }
  }

  // 清空数据
  const clearData = () => {
    settings.value = null
    aliases.value = null
  }

  return {
    loading,
    settings,
    aliases,
    getIndexSettings,
    updateIndexSettings,
    getAllAliases,
    getIndexAliases,
    manageAliases,
    addAlias,
    removeAlias,
    clearData
  }
})