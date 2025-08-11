import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Api } from '../api'
import { useConnectionStore } from './connection'
import type { IndexTemplate, TemplateRequest } from '../types'
import { Message } from '@arco-design/web-vue'

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<Record<string, IndexTemplate>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  const connectionStore = useConnectionStore()

  // 获取所有模板
  const fetchTemplates = async () => {
    if (!connectionStore.currentConnection?.id) {
      error.value = '请先选择连接'
      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await Api.getTemplates(connectionStore.currentConnection.id)
      templates.value = result
    } catch (err: any) {
      error.value = err.message || '获取模板失败'
      Message.error(error.value || '获取模板失败')
    } finally {
      loading.value = false
    }
  }

  // 获取单个模板
  const fetchTemplate = async (name: string) => {
    if (!connectionStore.currentConnection?.id) {
      error.value = '请先选择连接'
      return null
    }

    try {
      const result = await Api.getTemplate(connectionStore.currentConnection.id, name)
      return result[name] || null
    } catch (err: any) {
      const errorMessage = err.message || '获取模板失败'
      Message.error(errorMessage)
      throw err
    }
  }

  // 创建或更新模板
  const putTemplate = async (request: TemplateRequest) => {
    if (!connectionStore.currentConnection?.id) {
      error.value = '请先选择连接'
      return false
    }

    loading.value = true
    error.value = null

    try {
      await Api.putTemplate(connectionStore.currentConnection.id, request)
      Message.success(`模板 ${request.name} ${templates.value[request.name] ? '更新' : '创建'}成功`)
      
      // 刷新模板列表
      await fetchTemplates()
      return true
    } catch (err: any) {
      error.value = err.message || '保存模板失败'
      Message.error(error.value || '保存模板失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 删除模板
  const deleteTemplate = async (name: string) => {
    if (!connectionStore.currentConnection?.id) {
      error.value = '请先选择连接'
      return false
    }

    loading.value = true
    error.value = null

    try {
      await Api.deleteTemplate(connectionStore.currentConnection.id, name)
      Message.success(`模板 ${name} 删除成功`)
      
      // 从本地状态中移除
      delete templates.value[name]
      return true
    } catch (err: any) {
      error.value = err.message || '删除模板失败'
      Message.error(error.value || '删除模板失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 验证模板配置
  const validateTemplate = (template: IndexTemplate) => {
    const errors: string[] = []

    if (!template.index_patterns || template.index_patterns.length === 0) {
      errors.push('索引模式不能为空')
    }

    // 检查索引模式格式
    template.index_patterns.forEach(pattern => {
      if (!pattern.trim()) {
        errors.push('索引模式不能为空字符串')
      }
    })

    // 验证JSON格式
    if (template.settings) {
      try {
        if (typeof template.settings === 'string') {
          JSON.parse(template.settings)
        }
      } catch {
        errors.push('设置必须是有效的JSON格式')
      }
    }

    if (template.mappings) {
      try {
        if (typeof template.mappings === 'string') {
          JSON.parse(template.mappings)
        }
      } catch {
        errors.push('映射必须是有效的JSON格式')
      }
    }

    if (template.aliases) {
      try {
        if (typeof template.aliases === 'string') {
          JSON.parse(template.aliases)
        }
      } catch {
        errors.push('别名必须是有效的JSON格式')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 清空状态
  const clearState = () => {
    templates.value = {}
    error.value = null
    loading.value = false
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    fetchTemplate,
    putTemplate,
    deleteTemplate,
    validateTemplate,
    clearState
  }
})