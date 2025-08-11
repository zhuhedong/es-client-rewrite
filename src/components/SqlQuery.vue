<template>
  <div class="sql-query">
    <div class="query-section">
      <div class="toolbar">
        <a-space>
          <a-select
            v-model:model-value="selectedIndex"
            placeholder="选择索引"
            style="width: 200px"
            :options="indexOptions"
            @change="onIndexChange"
          />
          <a-dropdown @select="insertSampleQuery">
            <a-button>
              <template #icon><icon-code /></template>
              示例查询
              <template #suffix><icon-down /></template>
            </a-button>
            <template #content>
              <a-doption
                v-for="sample in sampleQueries"
                :key="sample.name"
                :value="sample.query"
              >
                {{ sample.name }}
              </a-doption>
            </template>
          </a-dropdown>
          <a-button type="primary" @click="executeQuery" :loading="loading">
            <template #icon><icon-play-arrow /></template>
            执行查询
          </a-button>
          <a-button @click="clearQuery">
            <template #icon><icon-delete /></template>
            清空
          </a-button>
        </a-space>
      </div>

      <div class="query-editor">
        <a-textarea
          v-model:model-value="queryText"
          placeholder="输入 SQL 查询语句，例如：SELECT * FROM &quot;your-index&quot; LIMIT 100"
          :rows="8"
          :auto-size="{ minRows: 8, maxRows: 20 }"
          class="sql-textarea"
        />
        
        <div class="query-options">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="每页数量" size="small">
                <a-input-number
                  v-model:model-value="fetchSize"
                  :min="1"
                  :max="10000"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="请求超时" size="small">
                <a-input
                  v-model:model-value="requestTimeout"
                  placeholder="30s"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="页面超时" size="small">
                <a-input
                  v-model:model-value="pageTimeout"
                  placeholder="45s"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
      </div>
    </div>

    <a-divider />

    <div class="result-section">
      <div v-if="loading" class="loading-container">
        <a-spin size="large" />
        <p>执行 SQL 查询中...</p>
      </div>

      <div v-else-if="sqlResult" class="result-container">
        <div class="result-header">
          <a-space>
            <a-statistic
              title="总行数"
              :value="totalFetched"
              :precision="0"
            />
            <a-button
              v-if="currentCursor"
              @click="fetchMore"
              :loading="loading"
              type="outline"
            >
              <template #icon><icon-download /></template>
              加载更多
            </a-button>
            <a-button
              v-if="currentCursor"
              @click="closeCursor"
              type="outline"
              status="warning"
            >
              <template #icon><icon-close /></template>
              关闭游标
            </a-button>
            <a-button @click="exportResults" type="outline">
              <template #icon><icon-export /></template>
              导出结果
            </a-button>
          </a-space>
        </div>

        <div class="result-table">
          <a-table
            :columns="tableColumns"
            :data="tableData"
            :pagination="pagination"
            :scroll="{ x: 'max-content', y: 500 }"
            size="small"
            stripe
          >
            <template #cell="{ column, record, rowIndex }">
              <div class="cell-content">
                <span v-if="typeof record[column.dataIndex] === 'object'">
                  {{ JSON.stringify(record[column.dataIndex]) }}
                </span>
                <span v-else>{{ record[column.dataIndex] }}</span>
              </div>
            </template>
          </a-table>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <a-empty description="请执行 SQL 查询来查看结果" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSqlStore } from '../stores/sql'
import { useConnectionStore } from '../stores/connection'
import { useIndexStore } from '../stores/index'
import { Message } from '@arco-design/web-vue'
import {
  IconCode,
  IconPlayArrow,
  IconDelete,
  IconDown,
  IconDownload,
  IconClose,
  IconExport
} from '@arco-design/web-vue/es/icon'

const sqlStore = useSqlStore()
const connectionStore = useConnectionStore()
const indexStore = useIndexStore()

const queryText = ref('')
const selectedIndex = ref('')
const fetchSize = ref(1000)
const requestTimeout = ref('30s')
const pageTimeout = ref('45s')

const loading = computed(() => sqlStore.loading)
const sqlResult = computed(() => sqlStore.sqlResult)
const currentCursor = computed(() => sqlStore.currentCursor)
const totalFetched = computed(() => sqlStore.totalFetched)
const sampleQueries = computed(() => sqlStore.sampleQueries)

// 索引选项
const indexOptions = computed(() => 
  indexStore.indices.map(index => ({
    label: index.name,
    value: index.name
  }))
)

// 表格列
const tableColumns = computed(() => {
  if (!sqlResult.value?.columns) return []
  
  return sqlResult.value.columns.map(col => ({
    title: col.name,
    dataIndex: col.name,
    width: 150,
    ellipsis: true,
    tooltip: true
  }))
})

// 表格数据
const tableData = computed(() => {
  if (!sqlResult.value?.rows || !sqlResult.value?.columns) return []
  
  return sqlResult.value.rows.map((row, index) => {
    const record: any = { _index: index }
    sqlResult.value!.columns.forEach((col, colIndex) => {
      record[col.name] = row[colIndex]
    })
    return record
  })
})

// 分页配置
const pagination = computed(() => ({
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: true,
  pageSizeOptions: ['20', '50', '100', '200']
}))

// 监听当前连接变化，重新加载索引
watch(() => connectionStore.currentConnection, async (connection) => {
  if (connection) {
    await indexStore.fetchIndices(connection.id)
  }
}, { immediate: true })

// 索引变化时替换查询中的占位符
const onIndexChange = (index: string) => {
  if (!index || !queryText.value) return
  
  // 替换查询中的 {index} 占位符
  queryText.value = queryText.value.replace(/\{index\}/g, index)
}

// 插入示例查询
const insertSampleQuery = (query: string) => {
  let finalQuery = query
  
  // 如果选择了索引，替换占位符
  if (selectedIndex.value) {
    finalQuery = finalQuery.replace(/\{index\}/g, selectedIndex.value)
  }
  
  queryText.value = finalQuery
}

// 执行查询
const executeQuery = async () => {
  if (!connectionStore.currentConnection) {
    Message.error('请先选择连接')
    return
  }
  
  if (!queryText.value.trim()) {
    Message.error('请输入 SQL 查询语句')
    return
  }
  
  const sqlQuery = {
    query: queryText.value,
    fetch_size: fetchSize.value,
    request_timeout: requestTimeout.value,
    page_timeout: pageTimeout.value
  }
  
  await sqlStore.executeSql(connectionStore.currentConnection.id, sqlQuery)
}

// 获取更多数据
const fetchMore = async () => {
  if (!connectionStore.currentConnection) return
  await sqlStore.fetchMore(connectionStore.currentConnection.id)
}

// 关闭游标
const closeCursor = async () => {
  if (!connectionStore.currentConnection) return
  await sqlStore.closeCursor(connectionStore.currentConnection.id)
}

// 清空查询
const clearQuery = () => {
  queryText.value = ''
  sqlStore.resetSqlResult()
}

// 导出结果
const exportResults = () => {
  if (!sqlResult.value) return
  
  // TODO: 实现导出功能
  Message.info('导出功能即将实现')
}
</script>

<style scoped>
.sql-query {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.query-section {
  flex-shrink: 0;
}

.toolbar {
  margin-bottom: 12px;
}

.query-editor {
  background: var(--color-bg-2);
  border-radius: 4px;
  padding: 12px;
}

.sql-textarea {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
}

.query-options {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-2);
}

.result-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.result-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.result-header {
  flex-shrink: 0;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-bg-2);
  border-radius: 4px;
}

.result-table {
  flex: 1;
  min-height: 0;
}

.cell-content {
  max-width: 200px;
  word-break: break-word;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
</style>