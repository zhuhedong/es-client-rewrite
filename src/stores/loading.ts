import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface LoadingState {
  id: string
  message: string
  progress?: number
  cancellable?: boolean
  onCancel?: () => void
}

export const useLoadingStore = defineStore('loading', () => {
  const loadingStates = ref<Map<string, LoadingState>>(new Map())
  
  // 计算属性：是否有任何加载状态
  const isLoading = computed(() => loadingStates.value.size > 0)
  
  // 计算属性：获取所有加载状态
  const allLoadingStates = computed(() => Array.from(loadingStates.value.values()))
  
  // 计算属性：获取主要加载状态（最新的一个）
  const primaryLoadingState = computed(() => {
    const states = allLoadingStates.value
    return states.length > 0 ? states[states.length - 1] : null
  })

  // 开始加载
  const startLoading = (
    id: string, 
    message: string, 
    options: {
      progress?: number
      cancellable?: boolean
      onCancel?: () => void
    } = {}
  ) => {
    const loadingState: LoadingState = {
      id,
      message,
      progress: options.progress,
      cancellable: options.cancellable,
      onCancel: options.onCancel
    }
    
    loadingStates.value.set(id, loadingState)
  }

  // 更新加载状态
  const updateLoading = (id: string, updates: Partial<LoadingState>) => {
    const existing = loadingStates.value.get(id)
    if (existing) {
      const updated = { ...existing, ...updates }
      loadingStates.value.set(id, updated)
    }
  }

  // 更新进度
  const updateProgress = (id: string, progress: number, message?: string) => {
    const updates: Partial<LoadingState> = { progress }
    if (message) {
      updates.message = message
    }
    updateLoading(id, updates)
  }

  // 停止加载
  const stopLoading = (id: string) => {
    loadingStates.value.delete(id)
  }

  // 清除所有加载状态
  const clearAllLoading = () => {
    loadingStates.value.clear()
  }

  // 获取特定加载状态
  const getLoadingState = (id: string) => {
    return loadingStates.value.get(id)
  }

  // 检查是否正在加载
  const isLoadingById = (id: string) => {
    return loadingStates.value.has(id)
  }

  return {
    loadingStates,
    isLoading,
    allLoadingStates,
    primaryLoadingState,
    startLoading,
    updateLoading,
    updateProgress,
    stopLoading,
    clearAllLoading,
    getLoadingState,
    isLoadingById
  }
})

// 组合式函数，提供便捷的加载状态管理
export function useLoadingState(defaultId?: string) {
  const loadingStore = useLoadingStore()
  const currentId = ref(defaultId || `loading_${Date.now()}_${Math.random().toString(36).substring(7)}`)

  // 便捷方法：开始加载
  const startLoading = (
    message: string,
    options: {
      id?: string
      progress?: number
      cancellable?: boolean
      onCancel?: () => void
    } = {}
  ) => {
    const id = options.id || currentId.value
    loadingStore.startLoading(id, message, {
      progress: options.progress,
      cancellable: options.cancellable,
      onCancel: options.onCancel
    })
    return id
  }

  // 便捷方法：停止加载
  const stopLoading = (id?: string) => {
    const targetId = id || currentId.value
    loadingStore.stopLoading(targetId)
  }

  // 便捷方法：更新进度
  const updateProgress = (progress: number, message?: string, id?: string) => {
    const targetId = id || currentId.value
    loadingStore.updateProgress(targetId, progress, message)
  }

  // 便捷方法：异步操作包装器
  const withLoading = async <T>(
    operation: (updateProgress?: (progress: number, message?: string) => void) => Promise<T>,
    options: {
      loadingMessage?: string
      successMessage?: string
      id?: string
      cancellable?: boolean
      onCancel?: () => void
    } = {}
  ): Promise<T | null> => {
    const {
      loadingMessage = '处理中...',
      successMessage,
      id,
      cancellable = false,
      onCancel
    } = options

    const loadingId = startLoading(loadingMessage, { id, cancellable, onCancel })

    try {
      const progressUpdater = (progress: number, message?: string) => {
        updateProgress(progress, message, loadingId)
      }

      const result = await operation(progressUpdater)
      
      if (successMessage) {
        // 可以在这里显示成功消息
        console.log(successMessage)
      }

      return result
    } catch (error) {
      throw error
    } finally {
      stopLoading(loadingId)
    }
  }

  // 计算属性：当前是否正在加载
  const isLoading = computed(() => loadingStore.isLoadingById(currentId.value))

  // 计算属性：当前加载状态
  const loadingState = computed(() => loadingStore.getLoadingState(currentId.value))

  return {
    currentId,
    isLoading,
    loadingState,
    startLoading,
    stopLoading,
    updateProgress,
    withLoading
  }
}