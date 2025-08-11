<template>
  <div class="search-results">
    <div class="results-header">
      <div class="results-info">
        <a-tag color="green" size="large">
          <template #icon>
            <icon-file />
          </template>
          {{ results.total }} 条记录
        </a-tag>
        <a-tag color="blue" size="large">
          <template #icon>
            <icon-clock-circle />
          </template>
          {{ results.took }}ms
        </a-tag>
        <a-tag v-if="results.timed_out" color="red" size="large">
          <template #icon>
            <icon-exclamation-circle />
          </template>
          查询超时
        </a-tag>
      </div>
      
      <a-space>
        <a-button size="small" @click="toggleView" type="outline">
          <template #icon>
            <icon-swap v-if="viewMode === 'table'" />
            <icon-code v-else />
          </template>
          {{ viewMode === 'table' ? '切换到JSON视图' : '切换到表格视图' }}
        </a-button>
        <a-button size="small" @click="exportResults" type="outline">
          <template #icon>
            <icon-download />
          </template>
          导出结果
        </a-button>
      </a-space>
    </div>

    <!-- 表格视图 -->
    <div v-if="viewMode === 'table'" class="table-view">
      <a-table 
        :data="tableData"
        :columns="tableColumns"
        :pagination="false"
        row-key="_id"
        size="small"
        :scroll="{ x: 'max-content', y: '500px' }"
        class="results-table"
      >
        <template #_id="{ record }">
          <a-tag color="blue">{{ record._id }}</a-tag>
        </template>
        
        <template #_score="{ record }">
          <a-tag color="green">{{ record._score?.toFixed(3) || 'N/A' }}</a-tag>
        </template>
      </a-table>
    </div>

    <!-- JSON视图 -->
    <div v-else class="json-view">
      <div class="json-results">
        <div 
          v-for="(hit, index) in results.hits" 
          :key="hit._id || index"
          class="json-result-item"
        >
          <div class="result-header">
            <div class="result-meta">
              <a-tag color="blue">ID: {{ hit._id }}</a-tag>
              <a-tag color="purple">Index: {{ hit._index }}</a-tag>
              <a-tag v-if="hit._score !== null" color="green">Score: {{ hit._score?.toFixed(3) }}</a-tag>
            </div>
            <a-button size="mini" @click="copyDocument(hit)" type="text">
              <template #icon>
                <icon-copy />
              </template>
              复制
            </a-button>
          </div>
          
          <div class="result-content">
            <pre class="json-content">{{ JSON.stringify(hit._source, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 空结果 -->
    <div v-if="results.hits.length === 0" class="empty-results">
      <a-empty description="没有找到匹配的文档">
        <template #image>
          <icon-file-image style="font-size: 64px; color: var(--gray-400);" />
        </template>
      </a-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SearchResult } from '../types'
import { Message } from '@arco-design/web-vue'
import {
  IconFile,
  IconClockCircle,
  IconExclamationCircle,
  IconSwap,
  IconCode,
  IconDownload,
  IconCopy,
  IconFileImage
} from '@arco-design/web-vue/es/icon'

interface Props {
  results: SearchResult
}

const props = defineProps<Props>()

const viewMode = ref<'table' | 'json'>('json')

// 表格数据
const tableData = computed(() => {
  return props.results.hits.map(hit => {
    const row: any = {
      _id: hit._id,
      _index: hit._index,
      _score: hit._score,
      ...flattenObject(hit._source || {})
    }
    return row
  })
})

// 表格列
const tableColumns = computed(() => {
  if (props.results.hits.length === 0) return []

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: '_id',
      slotName: '_id',
      width: 200,
      fixed: 'left' as const
    },
    {
      title: 'Score',
      dataIndex: '_score',
      slotName: '_score',
      width: 100
    }
  ]

  // 从第一条记录中提取字段作为列
  const firstHit = props.results.hits[0]
  if (firstHit?._source) {
    const fields = extractFieldsFromObject(firstHit._source)
    
    fields.forEach(field => {
      columns.push({
        title: field,
        dataIndex: field,
        width: 150
      })
    })
  }

  return columns
})

// 扁平化对象
const flattenObject = (obj: any, prefix = ''): any => {
  const flattened: any = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey))
      } else {
        flattened[newKey] = Array.isArray(value) ? value.join(', ') : value
      }
    }
  }
  
  return flattened
}

// 提取对象字段名
const extractFieldsFromObject = (obj: any, prefix = '', maxDepth = 2, currentDepth = 0): string[] => {
  const fields: string[] = []
  
  if (currentDepth >= maxDepth) return fields
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]
      const fullKey = prefix ? `${prefix}.${key}` : key
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // 递归处理嵌套对象
        const nestedFields = extractFieldsFromObject(value, fullKey, maxDepth, currentDepth + 1)
        fields.push(...nestedFields)
      } else {
        fields.push(fullKey)
      }
    }
  }
  
  return fields.slice(0, 20) // 限制字段数量
}

const toggleView = () => {
  viewMode.value = viewMode.value === 'table' ? 'json' : 'table'
}

const copyDocument = (hit: any) => {
  const text = JSON.stringify(hit, null, 2)
  navigator.clipboard.writeText(text).then(() => {
    Message.success('文档已复制到剪贴板')
  }).catch(() => {
    Message.error('复制失败')
  })
}

const exportResults = () => {
  const data = JSON.stringify(props.results, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `search_results_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  
  URL.revokeObjectURL(url)
  Message.success('结果已导出')
}
</script>

<style scoped>
.search-results {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--gray-200);
  background: var(--gray-50);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.results-info {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.table-view {
  padding: 1rem;
}

.results-table {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
}

.json-view {
  padding: 1rem;
}

.json-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.json-result-item {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: white;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.result-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.result-content {
  padding: 1rem;
}

.json-content {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.empty-results {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 2rem;
}

:deep(.arco-table-cell) {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.arco-table-td) {
  padding: 8px 12px;
}

:deep(.arco-table-th) {
  padding: 12px;
  background: var(--gray-100);
  font-weight: 600;
}
</style>