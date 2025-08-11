<template>
  <div class="error-boundary">
    <slot v-if="!hasError" />
    <div v-else class="error-fallback">
      <div class="error-container">
        <div class="error-icon">
          <icon-exclamation-circle-fill :size="48" />
        </div>
        
        <div class="error-content">
          <h3 class="error-title">{{ errorTitle }}</h3>
          <p class="error-message">{{ errorMessage }}</p>
          
          <div v-if="showDetails && errorDetails" class="error-details">
            <a-collapse>
              <a-collapse-item key="details" header="查看详细信息">
                <div class="error-detail-content">
                  <div v-if="error?.stack" class="error-section">
                    <h4>错误堆栈</h4>
                    <pre class="error-stack">{{ error.stack }}</pre>
                  </div>
                  
                  <div v-if="error?.context" class="error-section">
                    <h4>上下文信息</h4>
                    <pre class="error-context">{{ JSON.stringify(error.context, null, 2) }}</pre>
                  </div>
                  
                  <div class="error-section">
                    <h4>错误信息</h4>
                    <ul class="error-info-list">
                      <li>错误ID: {{ error?.id || 'unknown' }}</li>
                      <li>发生时间: {{ error?.timestamp ? new Date(error.timestamp).toLocaleString() : '未知' }}</li>
                      <li>组件路径: {{ componentPath }}</li>
                    </ul>
                  </div>
                </div>
              </a-collapse-item>
            </a-collapse>
          </div>
          
          <div class="error-actions">
            <a-space>
              <a-button type="primary" @click="handleRetry">
                <template #icon>
                  <icon-refresh />
                </template>
                重试
              </a-button>
              
              <a-button type="outline" @click="handleReset">
                <template #icon>
                  <icon-undo />
                </template>
                重置
              </a-button>
              
              <a-button v-if="showReportButton" type="text" @click="handleReport">
                <template #icon>
                  <icon-bug />
                </template>
                报告问题
              </a-button>
            </a-space>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured, provide, inject } from 'vue'
import { 
  IconExclamationCircleFill, 
  IconRefresh, 
  IconUndo, 
  IconBug 
} from '@arco-design/web-vue/es/icon'
import { errorHandler, type AppError, ErrorType, ErrorSeverity } from '../utils/errorHandler'
import { useNotificationStore } from '../stores/notification'

interface Props {
  fallbackTitle?: string
  fallbackMessage?: string
  showDetails?: boolean
  showReportButton?: boolean
  onRetry?: () => void | Promise<void>
  onReset?: () => void
  onReport?: (error: AppError) => void
}

const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: '出现了一些问题',
  fallbackMessage: '页面渲染时发生了错误，请尝试刷新页面或联系技术支持',
  showDetails: true,
  showReportButton: true
})

const emit = defineEmits<{
  'error': [error: AppError]
  'retry': []
  'reset': []
}>()

const hasError = ref(false)
const error = ref<AppError | null>(null)
const retryCount = ref(0)
const maxRetryCount = 3

const notificationStore = useNotificationStore()

// 提供错误边界上下文
const errorBoundaryContext = {
  reportError: (err: AppError) => {
    error.value = err
    hasError.value = true
    emit('error', err)
  },
  resetError: () => {
    hasError.value = false
    error.value = null
    retryCount.value = 0
  }
}

provide('errorBoundary', errorBoundaryContext)

// 计算属性
const errorTitle = computed(() => {
  if (error.value) {
    switch (error.value.severity) {
      case ErrorSeverity.CRITICAL:
        return '🚨 严重错误'
      case ErrorSeverity.HIGH:
        return '🔥 重要错误'
      case ErrorSeverity.MEDIUM:
        return '⚠️ 出现错误'
      case ErrorSeverity.LOW:
        return '💡 温馨提示'
      default:
        return props.fallbackTitle
    }
  }
  return props.fallbackTitle
})

const errorMessage = computed(() => {
  return error.value?.userMessage || props.fallbackMessage
})

const errorDetails = computed(() => {
  return error.value?.details || error.value?.stack
})

const componentPath = computed(() => {
  // 尝试从错误堆栈中提取组件路径
  if (error.value?.stack) {
    const match = error.value.stack.match(/at\s+(.+\.vue)/i)
    return match ? match[1] : '未知组件'
  }
  return '未知组件'
})

// 错误捕获
onErrorCaptured((err: Error, instance, info) => {
  console.error('Error boundary caught error:', err, info)
  
  const appError = errorHandler.createError(
    ErrorType.CLIENT,
    err.message,
    {
      severity: ErrorSeverity.HIGH,
      details: `Vue组件错误: ${info}`,
      stack: err.stack,
      context: {
        componentInfo: info,
        instanceId: instance?.$?.uid
      },
      retryable: true
    }
  )
  
  error.value = appError
  hasError.value = true
  emit('error', appError)
  
  return false // 阻止错误继续传播
})

// 事件处理
const handleRetry = async () => {
  if (retryCount.value >= maxRetryCount) {
    notificationStore.showWarning(`已达到最大重试次数 (${maxRetryCount})，请刷新页面`)
    return
  }
  
  retryCount.value++
  emit('retry')
  
  if (props.onRetry) {
    try {
      await props.onRetry()
      hasError.value = false
      error.value = null
      notificationStore.showSuccess('重试成功')
    } catch (retryError) {
      console.error('Retry failed:', retryError)
      notificationStore.showError(`重试失败 (${retryCount.value}/${maxRetryCount})`)
    }
  } else {
    // 默认重试：重新渲染组件
    hasError.value = false
    error.value = null
  }
}

const handleReset = () => {
  emit('reset')
  
  if (props.onReset) {
    props.onReset()
  }
  
  hasError.value = false
  error.value = null
  retryCount.value = 0
  notificationStore.showInfo('组件已重置')
}

const handleReport = () => {
  if (error.value) {
    if (props.onReport) {
      props.onReport(error.value)
    } else {
      // 默认报告行为：显示错误详情
      notificationStore.showErrorDetails(error.value)
    }
  }
}

// 暴露方法给父组件
defineExpose({
  hasError: computed(() => hasError.value),
  error: computed(() => error.value),
  reset: handleReset,
  retry: handleRetry
})
</script>

<style scoped>
.error-boundary {
  height: 100%;
  width: 100%;
}

.error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background: linear-gradient(135deg, var(--color-fill-1), var(--color-fill-2));
  border-radius: 8px;
  border: 1px solid var(--color-border-2);
}

.error-container {
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.error-icon {
  margin-bottom: 1.5rem;
  color: var(--color-danger-6);
}

.error-content {
  margin-bottom: 2rem;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text-1);
}

.error-message {
  font-size: 1rem;
  color: var(--color-text-2);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.error-details {
  margin: 1.5rem 0;
  text-align: left;
}

.error-detail-content {
  max-height: 300px;
  overflow-y: auto;
}

.error-section {
  margin-bottom: 1rem;
}

.error-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text-1);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.error-stack,
.error-context {
  background: var(--color-fill-2);
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.4;
  color: var(--color-text-2);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.error-info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.error-info-list li {
  padding: 0.25rem 0;
  font-size: 0.875rem;
  color: var(--color-text-2);
  border-bottom: 1px solid var(--color-border-3);
}

.error-info-list li:last-child {
  border-bottom: none;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-fallback {
    padding: 1rem;
    min-height: 300px;
  }
  
  .error-title {
    font-size: 1.25rem;
  }
  
  .error-message {
    font-size: 0.875rem;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .error-actions .arco-space {
    width: 100%;
    justify-content: center;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .error-fallback {
    background: linear-gradient(135deg, var(--color-bg-3), var(--color-bg-2));
  }
  
  .error-stack,
  .error-context {
    background: var(--color-bg-4);
    border-color: var(--color-border-3);
  }
}
</style>