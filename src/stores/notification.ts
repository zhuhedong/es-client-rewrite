import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { Message, Modal, Notification } from '@arco-design/web-vue'
import type { AppError, ErrorSeverity, ErrorType } from '../utils/errorHandler'

// 通知类型
export enum NotificationType {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

// 通知配置
export interface NotificationConfig {
  title?: string
  content: string
  type: NotificationType
  duration?: number
  closable?: boolean
  showIcon?: boolean
  actions?: Array<{
    label: string
    type?: 'primary' | 'outline' | 'text'
    action: () => void
  }>
}

// 重试配置
export interface RetryConfig {
  maxAttempts: number
  delay: number
  exponentialBackoff: boolean
}

// 通知历史记录
export interface NotificationHistory {
  id: string
  config: NotificationConfig
  timestamp: Date
  dismissed: boolean
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationHistory[]>([])
  const maxHistorySize = 100
  
  // 显示通知
  const showNotification = (config: NotificationConfig): string => {
    const id = generateNotificationId()
    
    // 记录到历史
    const historyItem: NotificationHistory = {
      id,
      config: { ...config },
      timestamp: new Date(),
      dismissed: false
    }
    
    notifications.value.unshift(historyItem)
    
    // 限制历史记录大小
    if (notifications.value.length > maxHistorySize) {
      notifications.value = notifications.value.slice(0, maxHistorySize)
    }
    
    // 显示通知
    const notificationOptions = {
      title: config.title || getDefaultTitle(config.type),
      content: config.content,
      duration: config.duration || getDefaultDuration(config.type),
      closable: config.closable ?? true,
      showIcon: config.showIcon ?? true,
      onClose: () => {
        markAsDismissed(id)
      }
    }
    
    switch (config.type) {
      case NotificationType.SUCCESS:
        Notification.success(notificationOptions)
        break
      case NotificationType.INFO:
        Notification.info(notificationOptions)
        break
      case NotificationType.WARNING:
        Notification.warning(notificationOptions)
        break
      case NotificationType.ERROR:
        Notification.error({
          ...notificationOptions,
          duration: 0 // 错误通知不自动关闭
        })
        break
    }
    
    return id
  }
  
  // 显示成功消息
  const showSuccess = (content: string, title?: string, duration?: number): string => {
    return showNotification({
      type: NotificationType.SUCCESS,
      content,
      title,
      duration
    })
  }
  
  // 显示信息消息
  const showInfo = (content: string, title?: string, duration?: number): string => {
    return showNotification({
      type: NotificationType.INFO,
      content,
      title,
      duration
    })
  }
  
  // 显示警告消息
  const showWarning = (content: string, title?: string, duration?: number): string => {
    return showNotification({
      type: NotificationType.WARNING,
      content,
      title,
      duration
    })
  }
  
  // 显示错误消息
  const showError = (content: string, title?: string, actions?: NotificationConfig['actions']): string => {
    return showNotification({
      type: NotificationType.ERROR,
      content,
      title,
      actions,
      duration: 0 // 错误不自动关闭
    })
  }
  
  // 从AppError显示通知
  const showErrorFromAppError = (error: AppError, showDetails: boolean = false): string => {
    const content = showDetails && error.details 
      ? `${error.userMessage}\n\n详细信息：${error.details}`
      : error.userMessage
    
    const actions: NotificationConfig['actions'] = []
    
    // 如果可重试，添加重试按钮
    if (error.retryable) {
      actions.push({
        label: '重试',
        type: 'primary',
        action: () => {
          // 这里应该由调用方提供重试逻辑
          console.log('Retry action triggered for error:', error.id)
        }
      })
    }
    
    // 添加查看详情按钮
    if (error.details || error.stack) {
      actions.push({
        label: '详情',
        type: 'text',
        action: () => showErrorDetails(error)
      })
    }
    
    return showNotification({
      type: NotificationType.ERROR,
      title: getErrorTitle(error.severity),
      content,
      actions,
      duration: 0
    })
  }
  
  // 显示带重试的错误消息
  const showErrorWithRetry = (
    content: string, 
    retryFn: () => Promise<void>,
    retryConfig: RetryConfig = { maxAttempts: 3, delay: 1000, exponentialBackoff: true }
  ): string => {
    const actions: NotificationConfig['actions'] = [{
      label: '重试',
      type: 'primary',
      action: async () => {
        await executeWithRetry(retryFn, retryConfig)
      }
    }]
    
    return showNotification({
      type: NotificationType.ERROR,
      content,
      actions,
      duration: 0
    })
  }
  
  // 显示确认对话框
  const showConfirm = (
    title: string,
    content: string,
    onConfirm: () => void | Promise<void>,
    onCancel?: () => void
  ): void => {
    Modal.confirm({
      title,
      content,
      onOk: async () => {
        try {
          await onConfirm()
        } catch (error) {
          console.error('Confirm action failed:', error)
          showError('操作失败，请重试')
        }
      },
      onCancel
    })
  }
  
  // 显示错误详情对话框
  const showErrorDetails = (error: AppError): void => {
    const content = `
<div class="error-details">
  <div class="error-section">
    <h4>错误信息</h4>
    <p>${error.message}</p>
  </div>
  
  ${error.details ? `
  <div class="error-section">
    <h4>详细描述</h4>
    <p>${error.details}</p>
  </div>
  ` : ''}
  
  <div class="error-section">
    <h4>错误属性</h4>
    <ul>
      <li>错误ID: ${error.id}</li>
      <li>错误类型: ${error.type}</li>
      <li>严重级别: ${error.severity}</li>
      <li>发生时间: ${error.timestamp.toLocaleString()}</li>
      <li>可重试: ${error.retryable ? '是' : '否'}</li>
      ${error.code ? `<li>错误代码: ${error.code}</li>` : ''}
    </ul>
  </div>
  
  ${error.context ? `
  <div class="error-section">
    <h4>上下文信息</h4>
    <pre>${JSON.stringify(error.context, null, 2)}</pre>
  </div>
  ` : ''}
  
  ${error.stack ? `
  <div class="error-section">
    <h4>错误堆栈</h4>
    <pre class="error-stack">${error.stack}</pre>
  </div>
  ` : ''}
</div>
    `
    
    Modal.info({
      title: '错误详情',
      content,
      width: 600,
      closable: true,
      footer: false
    })
  }
  
  // 带重试机制执行函数
  const executeWithRetry = async (
    fn: () => Promise<void>,
    config: RetryConfig
  ): Promise<void> => {
    let attempts = 0
    let delay = config.delay
    
    while (attempts < config.maxAttempts) {
      try {
        await fn()
        if (attempts > 0) {
          showSuccess(`操作成功（重试 ${attempts} 次后成功）`)
        }
        return
      } catch (error) {
        attempts++
        
        if (attempts >= config.maxAttempts) {
          showError(`操作失败，已重试 ${config.maxAttempts} 次`)
          throw error
        }
        
        showWarning(`操作失败，${delay}ms 后进行第 ${attempts + 1} 次重试...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        
        if (config.exponentialBackoff) {
          delay *= 2
        }
      }
    }
  }
  
  // 显示加载中的消息
  const showLoading = (content: string = '加载中...'): any => {
    return Message.loading({
      content,
      duration: 0
    })
  }
  
  // 隐藏加载消息
  const hideLoading = (id?: any): void => {
    if (id) {
      Message.clear(id)
    } else {
      Message.clear()
    }
  }
  
  // 标记通知为已忽略
  const markAsDismissed = (id: string): void => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.dismissed = true
    }
  }
  
  // 清空通知历史
  const clearHistory = (): void => {
    notifications.value = []
  }
  
  // 获取通知历史
  const getHistory = (limit?: number): NotificationHistory[] => {
    const history = notifications.value.filter(n => !n.dismissed)
    return limit ? history.slice(0, limit) : history
  }
  
  // 工具函数
  const generateNotificationId = (): string => {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  const getDefaultTitle = (type: NotificationType): string => {
    switch (type) {
      case NotificationType.SUCCESS:
        return '操作成功'
      case NotificationType.INFO:
        return '提示'
      case NotificationType.WARNING:
        return '警告'
      case NotificationType.ERROR:
        return '错误'
      default:
        return '通知'
    }
  }
  
  const getDefaultDuration = (type: NotificationType): number => {
    switch (type) {
      case NotificationType.SUCCESS:
        return 3000
      case NotificationType.INFO:
        return 4000
      case NotificationType.WARNING:
        return 5000
      case NotificationType.ERROR:
        return 0 // 不自动关闭
      default:
        return 4000
    }
  }
  
  const getErrorTitle = (severity: ErrorSeverity): string => {
    switch (severity) {
      case 'CRITICAL':
        return '🚨 严重错误'
      case 'HIGH':
        return '🔥 重要错误'
      case 'MEDIUM':
        return '⚠️ 错误'
      case 'LOW':
        return '💡 提示'
      default:
        return '❌ 错误'
    }
  }
  
  return {
    notifications,
    showNotification,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    showErrorFromAppError,
    showErrorWithRetry,
    showConfirm,
    showErrorDetails,
    executeWithRetry,
    showLoading,
    hideLoading,
    clearHistory,
    getHistory
  }
})