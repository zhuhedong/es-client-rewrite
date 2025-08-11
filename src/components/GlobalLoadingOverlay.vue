// 全局加载遮罩组件
<template>
  <div 
    v-if="showGlobalLoading" 
    class="global-loading-overlay"
    :class="{ 'backdrop-blur': blurBackground }"
  >
    <div class="loading-container">
      <!-- 主加载指示器 -->
      <div class="loading-spinner">
        <a-spin 
          :size="spinnerSize" 
          :loading="true"
          :tip="primaryState?.message || '加载中...'"
        >
          <template #icon>
            <LoadingOutlined v-if="spinnerType === 'spin'" />
            <SyncOutlined v-else-if="spinnerType === 'sync'" :spin="true" />
            <div v-else-if="spinnerType === 'dots'" class="loading-dots">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </template>
        </a-spin>
      </div>

      <!-- 进度条 -->
      <div v-if="primaryState?.progress !== undefined" class="progress-container">
        <a-progress 
          :percent="primaryState.progress" 
          :show-info="true"
          :status="primaryState.progress >= 100 ? 'success' : 'active'"
          :stroke-width="6"
        />
      </div>

      <!-- 取消按钮 -->
      <div v-if="primaryState?.cancellable" class="cancel-container">
        <a-button 
          type="text" 
          danger
          @click="handleCancel"
          :icon="h(CloseOutlined)"
        >
          取消操作
        </a-button>
      </div>

      <!-- 多个加载状态列表 -->
      <div v-if="showDetails && loadingStates.length > 1" class="loading-details">
        <div class="details-header">
          <span>正在进行的操作 ({{ loadingStates.length }})</span>
          <a-button 
            type="text" 
            size="small"
            @click="showDetails = false"
            :icon="h(UpOutlined)"
          />
        </div>
        <div class="details-list">
          <div 
            v-for="state in loadingStates" 
            :key="state.id"
            class="loading-item"
          >
            <div class="item-content">
              <a-spin :size="14" />
              <span class="item-message">{{ state.message }}</span>
            </div>
            <div v-if="state.progress !== undefined" class="item-progress">
              <a-progress 
                :percent="state.progress" 
                :show-info="false"
                size="small"
                :stroke-width="3"
              />
            </div>
            <a-button 
              v-if="state.cancellable"
              type="text" 
              size="small"
              danger
              @click="() => handleItemCancel(state)"
              :icon="h(CloseOutlined)"
            />
          </div>
        </div>
      </div>

      <!-- 展开详情按钮 -->
      <div 
        v-if="!showDetails && loadingStates.length > 1" 
        class="expand-details"
      >
        <a-button 
          type="text" 
          size="small"
          @click="showDetails = true"
          :icon="h(DownOutlined)"
        >
          查看所有操作 ({{ loadingStates.length }})
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useLoadingStore } from '../stores/loading'
import { 
  LoadingOutlined, 
  SyncOutlined, 
  CloseOutlined, 
  DownOutlined, 
  UpOutlined 
} from '@ant-design/icons-vue'

interface Props {
  // 是否显示全局加载遮罩
  show?: boolean
  // 遮罩层级
  zIndex?: number
  // 是否模糊背景
  blurBackground?: boolean
  // 加载指示器大小
  spinnerSize?: 'small' | 'default' | 'large'
  // 加载指示器类型
  spinnerType?: 'spin' | 'sync' | 'dots'
  // 最小显示时间（毫秒）
  minDisplayTime?: number
}

const props = withDefaults(defineProps<Props>(), {
  show: undefined,
  zIndex: 9999,
  blurBackground: true,
  spinnerSize: 'large',
  spinnerType: 'spin',
  minDisplayTime: 500
})

const loadingStore = useLoadingStore()
const showDetails = ref(false)

// 显示时间控制
const showStartTime = ref<number | null>(null)
const forceShow = ref(false)

// 计算是否显示全局加载
const showGlobalLoading = computed(() => {
  if (props.show !== undefined) {
    return props.show
  }
  
  const shouldShow = loadingStore.isLoading || forceShow.value
  
  // 最小显示时间控制
  if (shouldShow && !showStartTime.value) {
    showStartTime.value = Date.now()
  } else if (!shouldShow && showStartTime.value) {
    const elapsed = Date.now() - showStartTime.value
    if (elapsed < props.minDisplayTime) {
      // 强制显示剩余时间
      forceShow.value = true
      setTimeout(() => {
        forceShow.value = false
        showStartTime.value = null
      }, props.minDisplayTime - elapsed)
      return true
    }
    showStartTime.value = null
  }
  
  return shouldShow
})

// 加载状态列表
const loadingStates = computed(() => loadingStore.allLoadingStates)

// 主要加载状态
const primaryState = computed(() => loadingStore.primaryLoadingState)

// 处理取消操作
const handleCancel = () => {
  if (primaryState.value?.onCancel) {
    primaryState.value.onCancel()
  }
}

// 处理单个项目取消
const handleItemCancel = (state: any) => {
  if (state.onCancel) {
    state.onCancel()
  }
}
</script>

<style scoped>
.global-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: v-bind('props.zIndex');
  transition: all 0.3s ease;
}

.global-loading-overlay.backdrop-blur {
  backdrop-filter: blur(4px);
  background: rgba(255, 255, 255, 0.8);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  min-width: 300px;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1890ff;
  animation: dot-blink 1.4s ease-in-out infinite both;
}

.loading-dots .dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dots .dot:nth-child(2) { animation-delay: -0.16s; }
.loading-dots .dot:nth-child(3) { animation-delay: 0; }

@keyframes dot-blink {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.progress-container {
  width: 100%;
  padding: 0 16px;
}

.cancel-container {
  margin-top: 8px;
}

.loading-details {
  width: 100%;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.loading-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  font-size: 13px;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.item-message {
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-progress {
  min-width: 60px;
}

.expand-details {
  margin-top: 8px;
}

/* 深色主题支持 */
@media (prefers-color-scheme: dark) {
  .global-loading-overlay {
    background: rgba(0, 0, 0, 0.9);
  }
  
  .global-loading-overlay.backdrop-blur {
    background: rgba(0, 0, 0, 0.8);
  }
  
  .loading-container {
    background: #1f1f1f;
    color: #fff;
  }
  
  .details-header {
    color: #ccc;
    border-top-color: #333;
  }
  
  .loading-item {
    background: #2a2a2a;
  }
  
  .item-message {
    color: #ccc;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .loading-container {
    margin: 0 16px;
    padding: 24px 20px;
    min-width: auto;
    max-width: none;
  }
  
  .details-list {
    max-height: 150px;
  }
}
</style>