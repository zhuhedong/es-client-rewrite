// 错误类型枚举
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

// 错误严重级别
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 错误接口定义
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

// 错误处理器类
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorLog: AppError[] = []
  private maxLogSize = 1000

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  // 创建错误对象
  createError(
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
    const error: AppError = {
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

    this.logError(error)
    return error
  }

  // 处理API错误
  handleApiError(error: any, context?: Record<string, any>): AppError {
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return this.createError(ErrorType.NETWORK, '网络连接失败', {
        severity: ErrorSeverity.HIGH,
        details: error.message,
        context,
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
            context,
            retryable: false
          })
        case 401:
          return this.createError(ErrorType.AUTHENTICATION, '身份验证失败', {
            severity: ErrorSeverity.HIGH,
            details: '请检查用户名和密码',
            code: status,
            context,
            retryable: false
          })
        case 403:
          return this.createError(ErrorType.AUTHORIZATION, '权限不足', {
            severity: ErrorSeverity.HIGH,
            details: '您没有执行此操作的权限',
            code: status,
            context,
            retryable: false
          })
        case 404:
          return this.createError(ErrorType.ELASTICSEARCH, '资源未找到', {
            severity: ErrorSeverity.MEDIUM,
            details: data?.error?.reason || '请求的索引或文档不存在',
            code: status,
            context,
            retryable: false
          })
        case 408:
        case 504:
          return this.createError(ErrorType.TIMEOUT, '请求超时', {
            severity: ErrorSeverity.MEDIUM,
            details: '服务器响应超时，请重试',
            code: status,
            context,
            retryable: true
          })
        case 429:
          return this.createError(ErrorType.ELASTICSEARCH, '请求频率过高', {
            severity: ErrorSeverity.MEDIUM,
            details: '请求过于频繁，请稍后重试',
            code: status,
            context,
            retryable: true
          })
        case 500:
        case 502:
        case 503:
          return this.createError(ErrorType.SERVER, '服务器错误', {
            severity: ErrorSeverity.HIGH,
            details: data?.error?.reason || '服务器内部错误',
            code: status,
            context,
            retryable: true
          })
        default:
          return this.createError(ErrorType.UNKNOWN, '未知HTTP错误', {
            severity: ErrorSeverity.MEDIUM,
            details: `HTTP ${status}: ${data?.error?.reason || error.message}`,
            code: status,
            context,
            retryable: status >= 500
          })
      }
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return this.createError(ErrorType.CONNECTION, '连接失败', {
        severity: ErrorSeverity.HIGH,
        details: '无法连接到Elasticsearch服务器，请检查连接配置',
        code: error.code,
        context,
        retryable: true
      })
    }

    if (error.name === 'TimeoutError') {
      return this.createError(ErrorType.TIMEOUT, '操作超时', {
        severity: ErrorSeverity.MEDIUM,
        details: '操作执行时间过长，已自动取消',
        context,
        retryable: true
      })
    }

    return this.createError(ErrorType.UNKNOWN, '未知错误', {
      severity: ErrorSeverity.MEDIUM,
      details: error.message || '发生了未知错误',
      stack: error.stack,
      context,
      retryable: false
    })
  }

  // 处理验证错误
  handleValidationError(field: string, message: string, context?: Record<string, any>): AppError {
    return this.createError(ErrorType.VALIDATION, `字段验证失败: ${field}`, {
      severity: ErrorSeverity.LOW,
      details: message,
      context: { field, ...context },
      retryable: false
    })
  }

  // 记录错误
  private logError(error: AppError): void {
    this.errorLog.unshift(error)
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }

    // 控制台输出
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      console.error(`[${error.severity}] ${error.type}: ${error.message}`, {
        details: error.details,
        context: error.context,
        stack: error.stack
      })
    } else {
      console.warn(`[${error.severity}] ${error.type}: ${error.message}`, error.details)
    }
  }

  // 获取错误日志
  getErrorLog(limit?: number): AppError[] {
    return limit ? this.errorLog.slice(0, limit) : [...this.errorLog]
  }

  // 清空错误日志
  clearErrorLog(): void {
    this.errorLog = []
  }

  // 生成错误ID
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 推断错误严重级别
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

  // 判断是否可重试
  private isRetryableError(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.SERVER,
      ErrorType.CONNECTION
    ].includes(type)
  }

  // 生成用户友好的错误消息
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

  // 获取错误前缀图标
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
}

// 全局错误处理器实例
export const errorHandler = ErrorHandler.getInstance()

// 便捷方法
export const handleError = (error: any, context?: Record<string, any>): AppError => {
  return errorHandler.handleApiError(error, context)
}

export const createValidationError = (field: string, message: string, context?: Record<string, any>): AppError => {
  return errorHandler.handleValidationError(field, message, context)
}