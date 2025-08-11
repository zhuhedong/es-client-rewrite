<template>
  <div class="virtual-table" ref="containerRef" @scroll="onScroll">
    <div class="virtual-table-header">
      <div class="header-cell" v-for="column in columns" :key="column.key" :style="{ width: column.width }">
        {{ column.title }}
      </div>
    </div>
    
    <div class="virtual-table-body" :style="{ height: `${containerHeight}px` }">
      <!-- Spacer for items before visible range -->
      <div :style="{ height: `${topSpacerHeight}px` }"></div>
      
      <!-- Visible items -->
      <div
        v-for="(item, index) in visibleItems"
        :key="startIndex + index"
        class="virtual-table-row"
        :style="{ height: `${itemHeight}px` }"
        @click="$emit('row-click', item, startIndex + index)"
      >
        <div 
          v-for="column in columns" 
          :key="column.key" 
          class="table-cell"
          :style="{ width: column.width }"
        >
          <slot :name="column.key" :record="item" :index="startIndex + index">
            {{ getCellValue(item, column.key) }}
          </slot>
        </div>
      </div>
      
      <!-- Spacer for items after visible range -->
      <div :style="{ height: `${bottomSpacerHeight}px` }"></div>
      
      <!-- Loading indicator -->
      <div v-if="loading" class="loading-indicator">
        <a-spin size="small" />
        <span>加载中...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'

interface Column {
  key: string
  title: string
  width: string
}

interface Props {
  data: any[]
  columns: Column[]
  itemHeight?: number
  containerHeight?: number
  loading?: boolean
  hasMore?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  itemHeight: 40,
  containerHeight: 400,
  loading: false,
  hasMore: true
})

const emit = defineEmits<{
  'row-click': [item: any, index: number]
  'load-more': []
}>()

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)

// 计算可见范围
const visibleCount = computed(() => Math.ceil(props.containerHeight / props.itemHeight) + 2)
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - 1))
const endIndex = computed(() => Math.min(props.data.length, startIndex.value + visibleCount.value))

// 可见项目
const visibleItems = computed(() => props.data.slice(startIndex.value, endIndex.value))

// Spacer高度计算
const topSpacerHeight = computed(() => startIndex.value * props.itemHeight)
const bottomSpacerHeight = computed(() => (props.data.length - endIndex.value) * props.itemHeight)

// 滚动处理
const onScroll = (event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  
  // 检查是否需要加载更多数据
  const scrollBottom = target.scrollTop + target.clientHeight
  const totalHeight = props.data.length * props.itemHeight
  
  if (scrollBottom >= totalHeight - props.itemHeight && props.hasMore && !props.loading) {
    emit('load-more')
  }
}

// 获取单元格值
const getCellValue = (item: any, key: string) => {
  const keys = key.split('.')
  let value = item
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k]
    } else {
      return ''
    }
  }
  return value !== null && value !== undefined ? String(value) : ''
}

// 滚动到指定项目
const scrollToItem = (index: number) => {
  if (containerRef.value) {
    containerRef.value.scrollTop = index * props.itemHeight
  }
}

// 滚动到顶部
const scrollToTop = () => {
  if (containerRef.value) {
    containerRef.value.scrollTop = 0
  }
}

defineExpose({
  scrollToItem,
  scrollToTop
})
</script>

<style scoped>
.virtual-table {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: auto;
  background: white;
}

.virtual-table-header {
  display: flex;
  background: var(--color-fill-2);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-cell {
  padding: 8px 12px;
  font-weight: 600;
  color: var(--color-text-1);
  border-right: 1px solid var(--color-border);
  display: flex;
  align-items: center;
}

.header-cell:last-child {
  border-right: none;
}

.virtual-table-body {
  position: relative;
}

.virtual-table-row {
  display: flex;
  border-bottom: 1px solid var(--color-border-2);
  transition: background-color 0.2s;
  cursor: pointer;
}

.virtual-table-row:hover {
  background: var(--color-fill-1);
}

.virtual-table-row:last-child {
  border-bottom: none;
}

.table-cell {
  padding: 8px 12px;
  border-right: 1px solid var(--color-border-2);
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-cell:last-child {
  border-right: none;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--color-text-3);
  background: var(--color-fill-1);
}

/* 滚动条样式 */
.virtual-table::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.virtual-table::-webkit-scrollbar-track {
  background: var(--color-fill-2);
  border-radius: 3px;
}

.virtual-table::-webkit-scrollbar-thumb {
  background: var(--color-fill-4);
  border-radius: 3px;
}

.virtual-table::-webkit-scrollbar-thumb:hover {
  background: var(--color-fill-3);
}
</style>