// 统一错误处理工具 - 兼容新的结构化错误和原有系统
import { ref, readonly } from 'vue'
import { Message, Notification, Modal } from '@arco-design/web-vue'

// 新的结构化错误类型（来自 Rust 后端）
export interface StructuredError {
  error_type: 'Connection' | 'Authentication' | 'Network' | 'Validation' | 'NotFound' | 'ServerError' | 'Timeout' | 'RateLimited' | 'Conflict' | 'Forbidden' | 'UnknownError'
  code: string
  message: string
  details?: string
  suggestion?: string
  recoverable: boolean
}

// 保持向后兼容的错误类型
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  TIMEOUT = 'TIMEOUT',
  CONNECTION = 'CONNECTION',
  ELASTICSEARCH = 'ELASTICSEARCH',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  details?: string
  code?: string | number
  timestamp: Date
  context?: Record<string, any>
  stack?: string
  retryable: boolean
  userMessage: string
}

// 通知选项
export interface NotificationOptions {
  title?: string
  duration?: number
  showRetry?: boolean
  onRetry?: () => void
  showDetails?: boolean
}

// 增强的错误处理器
export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler
  private errorLog: (AppError | StructuredError)[] = []
  private maxLogSize = 1000
  private retryCallbacks = new Map<string, () => void>()

  private constructor() {}

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler()
    }
    return EnhancedErrorHandler.instance
  }

  // 主要的错误处理入口 - 自动检测错误类型
  handleError(error: any, options: NotificationOptions = {}): StructuredError | AppError {
    console.error('处理错误:', error)

    let processedError: StructuredError | AppError

    // 检查是否是新的结构化错误
    if (this.isStructuredError(error)) {
      processedError = error as StructuredError
      this.showStructuredErrorNotification(processedError, options)
    } else {
      // 使用原有的错误处理逻辑
      processedError = this.handleLegacyError(error, options.onRetry ? { retryable: true } : {})
      this.showLegacyErrorNotification(processedError, options)
    }

    this.logError(processedError)
    return processedError
  }

  // 检查是否是结构化错误
  private isStructuredError(error: any): boolean {
    return error && 
           typeof error === 'object' && 
           typeof error.error_type === 'string' &&
           typeof error.code === 'string' &&
           typeof error.message === 'string' &&
           typeof error.recoverable === 'boolean'
  }

  // 显示结构化错误通知
  private showStructuredErrorNotification(error: StructuredError, options: NotificationOptions) {
    const {
      title = '操作失败',
      duration = 0,
      showRetry = error.recoverable,
      onRetry,
      showDetails = true
    } = options

    const notificationId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    if (onRetry) {
      this.retryCallbacks.set(notificationId, onRetry)
    }

    let content = error.message
    if (error.suggestion) {
      content += `\n💡 建议: ${error.suggestion}`
    }

    const actions: any[] = []
    
    if (showRetry && onRetry && error.recoverable) {
      actions.push({
        content: '重试',
        style: { backgroundColor: '#165dff', color: '#ffffff' },
        onClick: () => {
          const callback = this.retryCallbacks.get(notificationId)
          if (callback) {
            callback()
            this.retryCallbacks.delete(notificationId)
          }
          Notification.remove(notificationId)
        }
      })
    }

    if (showDetails && error.details) {
      actions.push({
        content: '详情',
        onClick: () => this.showErrorDetailsModal(error)
      })
    }

    const notificationType = this.getNotificationTypeFromStructured(error.error_type)
    
    Notification[notificationType]({
      id: notificationId,
      title,
      content,
      duration,
      closable: true,
      onClose: () => {
        this.retryCallbacks.delete(notificationId)
      }
    })
  }

  // 获取通知类型
  private getNotificationTypeFromStructured(errorType: string): 'error' | 'warning' | 'info' {
    switch (errorType) {
      case 'Validation':
      case 'Timeout':
      case 'RateLimited':
        return 'warning'
      case 'Connection':
      case 'Authentication':
      case 'ServerError':
      case 'Forbidden':
        return 'error'
      default:
        return 'error'
    }
  }

  // 显示错误详情模态框
  private showErrorDetailsModal(error: StructuredError | AppError) {
    const isStructured = this.isStructuredError(error)
    
    const getErrorTypeText = (type: string) => {
      if (isStructured) {
        const typeMap: Record<string, string> = {
          'Connection': '🌐 连接错误',
          'Authentication': '🔒 认证错误',
          'Network': '🌐 网络错误',
          'Validation': '⚠️ 验证错误',
          'NotFound': '❓ 资源不存在',
          'ServerError': '🔧 服务器错误',
          'Timeout': '⏱️ 超时错误',
          'RateLimited': '🚦 请求限制',
          'Conflict': '⚡ 资源冲突',
          'Forbidden': '🚫 权限不足',
          'UnknownError': '❌ 未知错误'
        }
        return typeMap[type] || type
      } else {
        const typeMap: Record<string, string> = {
          'NETWORK': '🌐 网络错误',
          'AUTHENTICATION': '🔒 认证错误',
          'AUTHORIZATION': '🚫 权限错误',
          'VALIDATION': '⚠️ 验证错误',
          'SERVER': '🔧 服务器错误',
          'CLIENT': '📱 客户端错误',
          'TIMEOUT': '⏱️ 超时错误',
          'CONNECTION': '🌐 连接错误',
          'ELASTICSEARCH': '🔍 搜索引擎错误',
          'UNKNOWN': '❌ 未知错误'
        }
        return typeMap[type] || type
      }
    }

    const errorType = isStructured ? (error as StructuredError).error_type : (error as AppError).type
    const code = isStructured ? (error as StructuredError).code : (error as AppError).code
    const message = error.message
    const details = error.details
    const suggestion = isStructured ? (error as StructuredError).suggestion : undefined

    Modal.error({
      title: '错误详情',
      content: `
        <div style="margin: 16px 0;">
          <p><strong>错误类型:</strong> ${getErrorTypeText(errorType)}</p>
          <p><strong>错误代码:</strong> ${code || 'N/A'}</p>
          <p><strong>错误信息:</strong> ${message}</p>
          ${suggestion ? `<p><strong>建议:</strong> ${suggestion}</p>` : ''}
          ${details ? `
            <div style="margin-top: 16px;">
              <strong>详细信息:</strong>
              <pre style="background: #f6f8fa; padding: 12px; border-radius: 4px; margin-top: 8px; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow-y: auto;">${details}</pre>
            </div>
          ` : ''}
        </div>
      `,
      width: 600,
      okText: '确定'
    })
  }

  // 处理传统错误（保持向后兼容）
  private handleLegacyError(error: any, options: { retryable?: boolean } = {}): AppError {
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return this.createError(ErrorType.NETWORK, '网络连接失败', {
        severity: ErrorSeverity.HIGH,
        details: error.message,
        retryable: true
      })
    }

    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      switch (status) {
        case 400:
          return this.createError(ErrorType.VALIDATION, '请求参数错误', {
            severity: ErrorSeverity.MEDIUM,
            details: data?.error?.reason || error.message,
            code: status,
            retryable: false
          })
        case 401:
          return this.createError(ErrorType.AUTHENTICATION, '身份验证失败', {
            severity: ErrorSeverity.HIGH,
            details: '请检查用户名和密码',
            code: status,
            retryable: false
          })
        case 403:
          return this.createError(ErrorType.AUTHORIZATION, '权限不足', {
            severity: ErrorSeverity.HIGH,
            details: '您没有执行此操作的权限',
            code: status,
            retryable: false
          })
        case 404:
          return this.createError(ErrorType.ELASTICSEARCH, '资源未找到', {
            severity: ErrorSeverity.MEDIUM,
            details: data?.error?.reason || '请求的索引或文档不存在',
            code: status,
            retryable: false
          })
        case 408:
        case 504:
          return this.createError(ErrorType.TIMEOUT, '请求超时', {
            severity: ErrorSeverity.MEDIUM,
            details: '服务器响应超时，请重试',
            code: status,
            retryable: true
          })
        case 429:
          return this.createError(ErrorType.ELASTICSEARCH, '请求频率过高', {
            severity: ErrorSeverity.MEDIUM,
            details: '请求过于频繁，请稍后重试',
            code: status,
            retryable: true
          })
        case 500:
        case 502:
        case 503:
          return this.createError(ErrorType.SERVER, '服务器错误', {
            severity: ErrorSeverity.HIGH,
            details: data?.error?.reason || '服务器内部错误',
            code: status,
            retryable: true
          })
        default:
          return this.createError(ErrorType.UNKNOWN, '未知HTTP错误', {
            severity: ErrorSeverity.MEDIUM,
            details: `HTTP ${status}: ${data?.error?.reason || error.message}`,
            code: status,
            retryable: status >= 500
          })
      }
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return this.createError(ErrorType.CONNECTION, '连接失败', {
        severity: ErrorSeverity.HIGH,
        details: '无法连接到Elasticsearch服务器，请检查连接配置',
        code: error.code,
        retryable: true
      })
    }

    if (error.name === 'TimeoutError') {
      return this.createError(ErrorType.TIMEOUT, '操作超时', {
        severity: ErrorSeverity.MEDIUM,
        details: '操作执行时间过长，已自动取消',
        retryable: true
      })
    }

    // 处理字符串错误
    if (typeof error === 'string') {
      return this.createErrorFromString(error, options.retryable)
    }

    return this.createError(ErrorType.UNKNOWN, '未知错误', {
      severity: ErrorSeverity.MEDIUM,
      details: error.message || '发生了未知错误',
      stack: error.stack,
      retryable: options.retryable || false
    })
  }

  // 从字符串创建错误
  private createErrorFromString(errorStr: string, retryable?: boolean): AppError {
    const lowerError = errorStr.toLowerCase()

    if (lowerError.includes('connection') || lowerError.includes('network') || lowerError.includes('fetch')) {
      return this.createError(ErrorType.CONNECTION, '连接失败', {
        severity: ErrorSeverity.HIGH,
        details: errorStr,
        retryable: true
      })
    }

    if (lowerError.includes('timeout')) {
      return this.createError(ErrorType.TIMEOUT, '操作超时', {
        severity: ErrorSeverity.MEDIUM,
        details: errorStr,
        retryable: true
      })
    }

    if (lowerError.includes('auth') || lowerError.includes('401') || lowerError.includes('unauthorized')) {
      return this.createError(ErrorType.AUTHENTICATION, '认证失败', {
        severity: ErrorSeverity.HIGH,
        details: errorStr,
        retryable: false
      })
    }

    return this.createError(ErrorType.UNKNOWN, '操作失败', {
      severity: ErrorSeverity.MEDIUM,
      details: errorStr,
      retryable: retryable || false
    })
  }

  // 创建传统错误对象
  private createError(
    type: ErrorType,
    message: string,
    options: {
      severity?: ErrorSeverity
      details?: string
      code?: string | number
      context?: Record<string, any>
      stack?: string
      retryable?: boolean
    } = {}
  ): AppError {
    return {
      id: this.generateErrorId(),
      type,
      severity: options.severity || this.inferSeverity(type),
      message,
      details: options.details,
      code: options.code,
      timestamp: new Date(),
      context: options.context,
      stack: options.stack,
      retryable: options.retryable ?? this.isRetryableError(type),
      userMessage: this.generateUserMessage(type, message, options.code)
    }
  }

  // 显示传统错误通知
  private showLegacyErrorNotification(error: AppError, options: NotificationOptions) {
    const {
      title = '操作失败',
      duration = error.severity === ErrorSeverity.CRITICAL ? 0 : 5000,
      showRetry = error.retryable,
      onRetry,
      showDetails = true
    } = options

    const notificationType = this.getNotificationType(error.severity)
    
    const actions: any[] = []
    
    if (showRetry && onRetry && error.retryable) {
      const notificationId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`
      this.retryCallbacks.set(notificationId, onRetry)
      
      actions.push({
        content: '重试',
        style: { backgroundColor: '#165dff', color: '#ffffff' },
        onClick: () => {
          const callback = this.retryCallbacks.get(notificationId)
          if (callback) {
            callback()
            this.retryCallbacks.delete(notificationId)
          }
        }
      })
    }

    if (showDetails && error.details) {
      actions.push({
        content: '详情',
        onClick: () => this.showErrorDetailsModal(error)
      })
    }

    Notification[notificationType]({
      title,
      content: error.userMessage,
      duration,
      closable: true
    })
  }

  // 获取通知类型
  private getNotificationType(severity: ErrorSeverity): 'error' | 'warning' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.MEDIUM:
        return 'warning'
      case ErrorSeverity.LOW:
        return 'info'
      default:
        return 'error'
    }
  }

  // 辅助方法
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private inferSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
      case ErrorType.CONNECTION:
        return ErrorSeverity.HIGH
      case ErrorType.SERVER:
      case ErrorType.NETWORK:
        return ErrorSeverity.MEDIUM
      case ErrorType.VALIDATION:
      case ErrorType.CLIENT:
        return ErrorSeverity.LOW
      case ErrorType.ELASTICSEARCH:
        return ErrorSeverity.MEDIUM
      default:
        return ErrorSeverity.MEDIUM
    }
  }

  private isRetryableError(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.SERVER,
      ErrorType.CONNECTION
    ].includes(type)
  }

  private generateUserMessage(type: ErrorType, message: string, code?: string | number): string {
    const prefix = this.getErrorPrefix(type)
    
    switch (type) {
      case ErrorType.NETWORK:
        return `${prefix}网络连接异常，请检查网络设置后重试`
      case ErrorType.AUTHENTICATION:
        return `${prefix}登录失败，请检查用户名和密码`
      case ErrorType.AUTHORIZATION:
        return `${prefix}权限不足，请联系管理员`
      case ErrorType.VALIDATION:
        return `${prefix}输入信息有误，请检查后重试`
      case ErrorType.SERVER:
        return `${prefix}服务器暂时不可用，请稍后重试`
      case ErrorType.TIMEOUT:
        return `${prefix}操作超时，请重试`
      case ErrorType.CONNECTION:
        return `${prefix}连接失败，请检查服务器地址和端口`
      case ErrorType.ELASTICSEARCH:
        return `${prefix}Elasticsearch操作失败：${message}`
      default:
        return `${prefix}操作失败，请重试`
    }
  }

  private getErrorPrefix(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
      case ErrorType.CONNECTION:
        return '🌐 '
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return '🔒 '
      case ErrorType.VALIDATION:
        return '⚠️ '
      case ErrorType.SERVER:
        return '🔧 '
      case ErrorType.TIMEOUT:
        return '⏱️ '
      case ErrorType.ELASTICSEARCH:
        return '🔍 '
      default:
        return '❌ '
    }
  }

  private logError(error: AppError | StructuredError): void {
    this.errorLog.unshift(error)
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }

    // 控制台日志
    if (this.isStructuredError(error)) {
      const structured = error as StructuredError
      if (['ServerError', 'Connection', 'Authentication'].includes(structured.error_type)) {
        console.error(`[${structured.error_type}] ${structured.code}: ${structured.message}`, structured.details)
      } else {
        console.warn(`[${structured.error_type}] ${structured.code}: ${structured.message}`)
      }
    } else {
      const legacy = error as AppError
      if (legacy.severity === ErrorSeverity.CRITICAL || legacy.severity === ErrorSeverity.HIGH) {
        console.error(`[${legacy.severity}] ${legacy.type}: ${legacy.message}`, legacy.details)
      } else {
        console.warn(`[${legacy.severity}] ${legacy.type}: ${legacy.message}`)
      }
    }
  }

  // 便捷方法
  showError(message: string, options: { duration?: number; showRetry?: boolean; onRetry?: () => void } = {}) {
    const { duration = 4000, showRetry = false, onRetry } = options
    
    if (showRetry && onRetry) {
      this.handleError(message, { duration, showRetry, onRetry, showDetails: false })
    } else {
      Message.error(message)
    }
  }

  showSuccess(message: string, duration = 3000) {
    Message.success(message)
  }

  showWarning(message: string, duration = 4000) {
    Message.warning(message)
  }

  showInfo(message: string, duration = 3000) {
    Message.info(message)
  }

  showLoading(message = '处理中...') {
    return Message.loading({
      content: message,
      duration: 0
    })
  }

  confirm(
    title: string, 
    content: string, 
    options: {
      okText?: string
      cancelText?: string
      onOk?: () => void | Promise<void>
      onCancel?: () => void
      type?: 'info' | 'warning' | 'error'
    } = {}
  ) {
    const { okText = '确定', cancelText = '取消', onOk, onCancel, type = 'warning' } = options
    
    const modalMethod = type === 'error' ? Modal.error : type === 'warning' ? Modal.warning : Modal.confirm
    
    modalMethod({
      title,
      content,
      okText,
      cancelText,
      onOk,
      onCancel
    })
  }

  getErrorLog(limit?: number): (AppError | StructuredError)[] {
    return limit ? this.errorLog.slice(0, limit) : [...this.errorLog]
  }

  clearErrorLog(): void {
    this.errorLog = []
  }

  cleanup() {
    this.retryCallbacks.clear()
  }
}

// 单例实例
export const enhancedErrorHandler = EnhancedErrorHandler.getInstance()

// Vue 组合式函数
export function useErrorHandler() {
  const loading = ref(false)

  const handleAsync = async <T>(
    operation: () => Promise<T>,
    options: {
      loadingMessage?: string
      successMessage?: string
      errorOptions?: NotificationOptions
    } = {}
  ): Promise<T | null> => {
    const { loadingMessage, successMessage, errorOptions = {} } = options

    try {
      loading.value = true
      
      let loadingInstance: any = null
      if (loadingMessage) {
        loadingInstance = enhancedErrorHandler.showLoading(loadingMessage)
      }

      const result = await operation()

      if (loadingInstance) {
        loadingInstance.close()
      }

      if (successMessage) {
        enhancedErrorHandler.showSuccess(successMessage)
      }

      return result
    } catch (error) {
      enhancedErrorHandler.handleError(error, errorOptions)
      return null
    } finally {
      loading.value = false
    }
  }

  const handleError = (error: any, options?: NotificationOptions) => {
    return enhancedErrorHandler.handleError(error, options)
  }

  return {
    loading: readonly(loading),
    handleAsync,
    handleError,
    showError: enhancedErrorHandler.showError.bind(enhancedErrorHandler),
    showSuccess: enhancedErrorHandler.showSuccess.bind(enhancedErrorHandler),
    showWarning: enhancedErrorHandler.showWarning.bind(enhancedErrorHandler),
    showInfo: enhancedErrorHandler.showInfo.bind(enhancedErrorHandler),
    showLoading: enhancedErrorHandler.showLoading.bind(enhancedErrorHandler),
    confirm: enhancedErrorHandler.confirm.bind(enhancedErrorHandler)
  }
}

// 保持向后兼容的导出
export const errorHandler = enhancedErrorHandler
export const handleError = (error: any, context?: Record<string, any>) => {
  return enhancedErrorHandler.handleError(error, { showDetails: true })
}

export const createValidationError = (field: string, message: string, context?: Record<string, any>) => {
  return enhancedErrorHandler.handleError(`字段验证失败: ${field} - ${message}`)
}

// 全局错误处理设置
export function setupGlobalErrorHandler() {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason)
    enhancedErrorHandler.handleError(event.reason, {
      title: '系统错误',
      showDetails: true
    })
    event.preventDefault()
  })

  window.addEventListener('error', (event) => {
    console.error('未处理的脚本错误:', event.error)
    enhancedErrorHandler.handleError(event.error, {
      title: '脚本错误',
      showDetails: true
    })
  })
}