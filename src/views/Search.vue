<template>
  <div class="search-page">
    <div class="page-header">
      <h1>数据查询</h1>
      <a-space>
        <a-button @click="executeSearch" :loading="searchStore.loading" type="primary">
          <template #icon>
            <icon-search />
          </template>
          执行查询
        </a-button>
        <a-button @click="clearResults">
          <template #icon>
            <icon-delete />
          </template>
          清空结果
        </a-button>
      </a-space>
    </div>

    <div v-if="!connectionStore.currentConnection" class="no-connection">
      <a-empty description="请先选择一个连接" />
    </div>

    <div v-else class="search-content">
      <a-row :gutter="24">
        <!-- 查询配置 -->
        <a-col :span="8">
          <a-card title="查询配置">
            <a-form :model="queryForm" layout="vertical">
              <a-form-item label="索引名称" required>
                <a-select 
                  v-model="queryForm.index" 
                  placeholder="选择索引"
                  allow-search
                  @focus="loadIndices"
                >
                  <a-option 
                    v-for="index in indexStore.indices" 
                    :key="index.name" 
                    :value="index.name"
                  >
                    {{ index.name }}
                  </a-option>
                </a-select>
              </a-form-item>

              <a-form-item label="起始位置">
                <a-input-number 
                  v-model="queryForm.from" 
                  :min="0" 
                  placeholder="0"
                  style="width: 100%"
                />
              </a-form-item>

              <a-form-item label="返回数量">
                <a-input-number 
                  v-model="queryForm.size" 
                  :min="1" 
                  :max="10000"
                  placeholder="10"
                  style="width: 100%"
                />
              </a-form-item>

              <a-form-item label="查询条件（JSON）">
                <QueryEditor
                  v-model="queryText"
                  placeholder="请输入查询JSON..."
                  height="250px"
                  :connection-id="connectionStore.currentConnection?.id"
                  :selected-index="queryForm.index"
                  :show-validation="true"
                  :format-on-blur="true"
                  :enable-autocomplete="true"
                  @validation-change="onQueryValidationChange"
                />
                <div class="autocomplete-hint">
                  <div class="hint-icon">💡</div>
                  <div class="hint-text">
                    支持字段名和查询语法自动补全，按 <kbd>Ctrl+Space</kbd> 触发补全菜单
                  </div>
                </div>
              </a-form-item>

              <a-form-item label="排序条件（JSON，可选）">
                <JsonEditor
                  v-model="sortText"
                  placeholder="请输入排序JSON（可选）..."
                  height="120px"
                  :show-validation="true"
                  :format-on-blur="true"
                  @validation-change="onSortValidationChange"
                />
              </a-form-item>

              <!-- 快速查询模板 -->
              <a-form-item label="快速模板">
                <a-space direction="vertical" style="width: 100%">
                  <a-button size="small" @click="setTemplate('match_all')" block>
                    查询所有
                  </a-button>
                  <a-button size="small" @click="setTemplate('match')" block>
                    匹配查询
                  </a-button>
                  <a-button size="small" @click="setTemplate('range')" block>
                    范围查询
                  </a-button>
                  <a-button size="small" @click="setTemplate('bool')" block>
                    布尔查询
                  </a-button>
                  <a-divider orientation="center">聚合查询</a-divider>
                  <a-button size="small" @click="setTemplate('terms_agg')" block type="outline">
                    分组聚合
                  </a-button>
                  <a-button size="small" @click="setTemplate('date_histogram')" block type="outline">
                    时间聚合
                  </a-button>
                  <a-button size="small" @click="setTemplate('stats_agg')" block type="outline">
                    统计聚合
                  </a-button>
                </a-space>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>

        <!-- 查询结果 -->
        <a-col :span="16">
          <a-card>
            <template #title>
              <div class="result-title">
                查询结果
                <span v-if="searchResult" class="result-stats">
                  （共 {{ searchResult.total }} 条，耗时 {{ searchResult.took }}ms）
                </span>
              </div>
            </template>

            <div v-if="!searchResult" class="no-result">
              <a-empty description="暂无查询结果" />
            </div>

            <div v-else>
              <a-tabs default-active-key="table" :lazy-load="true">
                <!-- 表格视图 -->
                <a-tab-pane key="table" title="表格视图">
                  <div class="table-controls">
                    <a-space>
                      <span>显示模式：</span>
                      <a-radio-group v-model="viewMode" size="small">
                        <a-radio value="virtual">虚拟滚动</a-radio>
                        <a-radio value="pagination">分页模式</a-radio>
                      </a-radio-group>
                      <span v-if="searchResult" class="data-info">
                        当前显示 {{ searchResult.hits.length }} 条，共 {{ searchResult.total }} 条记录
                      </span>
                    </a-space>
                  </div>

                  <!-- 虚拟滚动表格 -->
                  <VirtualTable
                    v-if="viewMode === 'virtual'"
                    :data="searchResult.hits"
                    :columns="tableColumns"
                    :container-height="500"
                    :item-height="60"
                    :loading="searchStore.loadingMore"
                    :has-more="hasMoreData"
                    @load-more="loadMoreData"
                    @row-click="onRowClick"
                  >
                    <template #_index="{ record }">
                      {{ record._index }}
                    </template>
                    <template #_type="{ record }">
                      {{ record._type }}
                    </template>
                    <template #_id="{ record }">
                      <span class="doc-id">{{ record._id }}</span>
                    </template>
                    <template #_score="{ record }">
                      <span class="score-badge">{{ record._score?.toFixed(3) || 'N/A' }}</span>
                    </template>
                    <template #_source="{ record }">
                      <div class="source-preview">
                        <pre>{{ JSON.stringify(record._source, null, 2).slice(0, 200) }}...</pre>
                      </div>
                    </template>
                  </VirtualTable>

                  <!-- 传统分页表格 -->
                  <a-table 
                    v-else
                    :data="searchResult.hits"
                    :pagination="false"
                    :scroll="{ x: '100%', y: '400px' }"
                    size="small"
                  >
                    <template #columns>
                      <a-table-column title="索引" data-index="_index" :width="120" />
                      <a-table-column title="类型" data-index="_type" :width="100" />
                      <a-table-column title="ID" data-index="_id" :width="150" />
                      <a-table-column title="评分" data-index="_score" :width="80" />
                      <a-table-column title="数据" :width="400">
                        <template #cell="{ record }">
                          <pre class="source-data">{{ JSON.stringify(record._source, null, 2) }}</pre>
                        </template>
                      </a-table-column>
                    </template>
                  </a-table>
                </a-tab-pane>

                <!-- 可视化视图 -->
                <a-tab-pane key="visualization" title="可视化" v-if="hasAggregations">
                  <VisualizationPanel 
                    :search-result="searchResult"
                    :key="visualizationKey"
                  />
                </a-tab-pane>

                <!-- JSON视图 -->
                <a-tab-pane key="json" title="JSON视图">
                  <pre class="json-result">{{ JSON.stringify(searchResult, null, 2) }}</pre>
                </a-tab-pane>
              </a-tabs>

              <!-- 分页 -->
              <div class="pagination-wrapper" v-if="viewMode === 'pagination'">
                <a-pagination 
                  :current="currentPage"
                  :page-size="queryForm.size || 10"
                  :total="searchResult.total"
                  @change="onPageChange"
                  @page-size-change="onPageSizeChange"
                  show-total
                  show-jumper
                  show-page-size
                  :page-size-options="['10', '20', '50', '100', '200']"
                />
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useConnectionStore } from '../stores/connection'
import { useIndexStore } from '../stores/index'
import { useSearchStore } from '../stores/search'
import { IconSearch, IconDelete } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import VisualizationPanel from '../components/VisualizationPanel.vue'
import JsonEditor from '../components/JsonEditor.vue'
import QueryEditor from '../components/QueryEditor.vue'
import VirtualTable from '../components/VirtualTable.vue'
import { Api } from '../api'

const connectionStore = useConnectionStore()
const indexStore = useIndexStore()
const searchStore = useSearchStore()

const queryForm = ref({
  index: '',
  from: 0,
  size: 10
})

const queryText = ref('{\n  "match_all": {}\n}')
const sortText = ref('')
const viewMode = ref('pagination') // 'virtual' | 'pagination'

// JSON validation states
const queryValid = ref(true)
const sortValid = ref(true)
const queryValidationError = ref('')
const sortValidationError = ref('')

const searchResult = computed(() => searchStore.searchResult)

// 虚拟滚动的数据管理
const allData = ref<any[]>([])
const isLoadingMore = ref(false)

// 表格列定义
const tableColumns = [
  { key: '_index', title: '索引', width: '120px' },
  { key: '_type', title: '类型', width: '100px' },
  { key: '_id', title: 'ID', width: '150px' },
  { key: '_score', title: '评分', width: '80px' },
  { key: '_source', title: '数据', width: '400px' }
]

// 是否有更多数据
const hasMoreData = computed(() => {
  if (!searchResult.value) return false
  return allData.value.length < (searchResult.value.total || 0)
})

// 检查搜索结果是否包含聚合数据
const hasAggregations = computed(() => {
  return searchResult.value?.aggregations && 
         Object.keys(searchResult.value.aggregations).length > 0
})

// 可视化组件的key，用于强制重新渲染
const visualizationKey = ref(0)

// 计算当前页数
const currentPage = computed(() => {
  return Math.floor((queryForm.value.from || 0) / (queryForm.value.size || 10)) + 1
})

// 查询模板
const templates = {
  match_all: '{\n  "match_all": {}\n}',
  match: '{\n  "match": {\n    "field_name": "search_value"\n  }\n}',
  range: '{\n  "range": {\n    "field_name": {\n      "gte": 10,\n      "lte": 20\n    }\n  }\n}',
  bool: '{\n  "bool": {\n    "must": [\n      { "match": { "field1": "value1" } }\n    ],\n    "filter": [\n      { "term": { "field2": "value2" } }\n    ]\n  }\n}',
  // 添加聚合查询模板
  terms_agg: '{\n  "match_all": {},\n  "aggs": {\n    "field_terms": {\n      "terms": {\n        "field": "field_name.keyword",\n        "size": 10\n      }\n    }\n  }\n}',
  date_histogram: '{\n  "match_all": {},\n  "aggs": {\n    "date_trend": {\n      "date_histogram": {\n        "field": "@timestamp",\n        "calendar_interval": "day"\n      }\n    }\n  }\n}',
  stats_agg: '{\n  "match_all": {},\n  "aggs": {\n    "field_stats": {\n      "stats": {\n        "field": "numeric_field"\n      }\n    }\n  }\n}'
}

onMounted(() => {
  if (connectionStore.currentConnection) {
    loadIndices()
  }
  
  // 从store中恢复查询条件
  if (searchStore.query.index) {
    queryForm.value.index = searchStore.query.index
    queryForm.value.from = searchStore.query.from || 0
    queryForm.value.size = searchStore.query.size || 10
    queryText.value = JSON.stringify(searchStore.query.query, null, 2)
  }
})

watch(
  () => connectionStore.currentConnection,
  (newConnection) => {
    if (newConnection) {
      loadIndices()
    }
  }
)

const loadIndices = async () => {
  if (!connectionStore.currentConnection) return
  await indexStore.fetchIndices(connectionStore.currentConnection.id)
}

const executeSearch = async () => {
  if (!connectionStore.currentConnection) {
    Message.error('请先选择连接')
    return
  }

  if (!queryForm.value.index) {
    Message.error('请选择索引')
    return
  }

  // Check JSON validation before executing
  if (!queryValid.value) {
    Message.error('查询条件JSON格式错误：' + queryValidationError.value)
    return
  }

  if (sortText.value.trim() && !sortValid.value) {
    Message.error('排序条件JSON格式错误：' + sortValidationError.value)
    return
  }

  try {
    let query
    try {
      query = JSON.parse(queryText.value)
    } catch (error) {
      Message.error('查询条件JSON格式错误')
      return
    }

    let sort = undefined
    if (sortText.value.trim()) {
      try {
        sort = JSON.parse(sortText.value)
      } catch (error) {
        Message.error('排序条件JSON格式错误')
        return
      }
    }

    const searchQuery = {
      index: queryForm.value.index,
      query,
      from: queryForm.value.from,
      size: queryForm.value.size,
      sort
    }

    await searchStore.executeSearch(connectionStore.currentConnection.id, searchQuery)
    
    // 如果有聚合数据，更新可视化组件
    if (searchStore.searchResult?.aggregations) {
      visualizationKey.value++
    }
  } catch (error) {
    console.error('Search failed:', error)
  }
}

const clearResults = () => {
  searchStore.resetSearchResult()
}

const setTemplate = (templateName: keyof typeof templates) => {
  queryText.value = templates[templateName]
}

// Validation handlers
const onQueryValidationChange = (isValid: boolean, error?: string) => {
  queryValid.value = isValid
  queryValidationError.value = error || ''
}

const onSortValidationChange = (isValid: boolean, error?: string) => {
  sortValid.value = isValid
  sortValidationError.value = error || ''
}

const onPageChange = async (page: number) => {
  console.log('Page change:', page, 'Size:', queryForm.value.size)
  
  if (!connectionStore.currentConnection) return
  
  // 使用 store 的优化分页方法
  await searchStore.goToPage(connectionStore.currentConnection.id, page, queryForm.value.size)
  
  // 预加载下一页
  nextTick(() => {
    if (connectionStore.currentConnection) {
      searchStore.preloadNextPage(connectionStore.currentConnection.id)
    }
  })
}

const onPageSizeChange = (pageSize: number) => {
  console.log('Page size change:', pageSize)
  
  if (pageSize < 1) pageSize = 10
  if (pageSize > 10000) pageSize = 10000
  
  const currentPage = Math.floor((queryForm.value.from || 0) / (queryForm.value.size || 10)) + 1
  queryForm.value.size = pageSize
  queryForm.value.from = Math.floor((queryForm.value.from || 0) / pageSize) * pageSize
  
  executeSearch()
}

// 加载更多数据（虚拟滚动模式）
const loadMoreData = async () => {
  if (!connectionStore.currentConnection || isLoadingMore.value || !hasMoreData.value) return
  
  try {
    isLoadingMore.value = true
    const nextFrom = allData.value.length
    const batchSize = 50 // 每次加载50条
    
    const searchQuery = {
      index: queryForm.value.index,
      query: JSON.parse(queryText.value),
      from: nextFrom,
      size: batchSize,
      sort: sortText.value.trim() ? JSON.parse(sortText.value) : undefined
    }
    
    // 使用流式搜索API
    const result = await Api.searchDocumentsStream(
      connectionStore.currentConnection.id, 
      searchQuery,
      batchSize,
      batchSize
    )
    
    if (result && result.length > 0) {
      allData.value.push(...result)
    }
  } catch (error) {
    console.error('Load more failed:', error)
    Message.error('加载更多数据失败')
  } finally {
    isLoadingMore.value = false
  }
}

// 行点击事件
const onRowClick = (item: any, index: number) => {
  console.log('Row clicked:', item, index)
  // 可以在这里实现详情查看等功能
}

// 监听视图模式变化
watch(viewMode, (newMode) => {
  if (newMode === 'virtual' && searchResult.value) {
    // 切换到虚拟滚动时，初始化所有数据
    allData.value = [...searchResult.value.hits]
  }
})
</script>

<style scoped>
.search-page {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gray-200);
}

.page-header h1 {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--gray-900);
  background: linear-gradient(135deg, var(--primary-color), var(--warning-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.no-connection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  background: linear-gradient(135deg, var(--gray-50), white);
  border-radius: var(--radius-xl);
  border: 2px dashed var(--gray-300);
}

.search-content {
  height: calc(100% - 120px);
}

.result-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-stats {
  color: var(--gray-600);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
}

.no-result {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background: linear-gradient(135deg, var(--gray-50), white);
  border-radius: var(--radius-xl);
  border: 2px dashed var(--gray-300);
}

.source-data {
  background: linear-gradient(135deg, var(--gray-50), var(--gray-100));
  padding: 1rem;
  border-radius: var(--radius-lg);
  font-size: 0.75rem;
  line-height: 1.6;
  max-height: 200px;
  overflow: auto;
  margin: 0;
  border: 1px solid var(--gray-200);
  box-shadow: var(--shadow-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.json-result {
  background: linear-gradient(135deg, var(--gray-900), var(--gray-800));
  color: #e2e8f0;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  max-height: 600px;
  overflow: auto;
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
  border: 1px solid var(--gray-700);
  box-shadow: var(--shadow-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.pagination-wrapper {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: var(--gray-50);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
}

/* 自动补全提示样式 */
.autocomplete-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 1px solid #0ea5e9;
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  color: #0369a1;
}

.hint-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.hint-text kbd {
  background: #1e40af;
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 现代化卡片样式 */
:deep(.arco-card) {
  background: linear-gradient(135deg, white, var(--gray-50));
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-xl) !important;
  box-shadow: var(--shadow) !important;
  transition: all 0.3s ease;
  overflow: hidden;
}

:deep(.arco-card:hover) {
  box-shadow: var(--shadow-lg) !important;
  transform: translateY(-2px);
}

:deep(.arco-card-header) {
  background: linear-gradient(135deg, var(--gray-50), white) !important;
  color: var(--gray-800) !important;
  border-bottom: 1px solid var(--gray-200) !important;
  padding: 1.25rem 1.5rem !important;
}

:deep(.arco-card-header-title) {
  color: var(--gray-800) !important;
  font-weight: 700 !important;
  font-size: 1.125rem !important;
}

:deep(.arco-card-body) {
  padding: 1.5rem !important;
}

/* 现代化表单样式 */
:deep(.arco-form-item-label-text) {
  font-weight: 600 !important;
  color: var(--gray-700) !important;
  font-size: 0.875rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.025em !important;
}

:deep(.arco-textarea) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  font-size: 0.875rem !important;
  line-height: 1.6 !important;
}

/* 现代化标签页样式 */
:deep(.arco-tabs-nav) {
  background: var(--gray-50) !important;
  padding: 0.5rem !important;
  border-radius: var(--radius-lg) !important;
  margin-bottom: 1.5rem !important;
}

:deep(.arco-tabs-tab) {
  border-radius: var(--radius) !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}

:deep(.arco-tabs-tab-active) {
  background: white !important;
  color: var(--primary-color) !important;
  box-shadow: var(--shadow-sm) !important;
}

/* 快速模板按钮 */
:deep(.arco-space-vertical .arco-btn) {
  justify-content: flex-start !important;
  text-align: left !important;
  background: var(--gray-50) !important;
  border: 1px solid var(--gray-200) !important;
  color: var(--gray-700) !important;
  font-weight: 500 !important;
}

:deep(.arco-space-vertical .arco-btn:hover) {
  background: var(--primary-color) !important;
  color: white !important;
  border-color: var(--primary-color) !important;
  transform: translateX(4px) !important;
}

/* 分页样式 */
:deep(.arco-pagination) {
  gap: 0.5rem !important;
}

:deep(.arco-pagination-item) {
  border-radius: var(--radius) !important;
  border: 1px solid var(--gray-300) !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

:deep(.arco-pagination-item:hover) {
  border-color: var(--primary-color) !important;
  color: var(--primary-color) !important;
  transform: translateY(-1px) !important;
}

:deep(.arco-pagination-item-active) {
  background: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
  color: white !important;
}

/* 表格控制区域 */
.table-controls {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--gray-50);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
}

.data-info {
  color: var(--color-text-3);
  font-size: 0.875rem;
  font-weight: 500;
}

/* 虚拟滚动相关样式 */
.doc-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-text-2);
  background: var(--color-fill-2);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-badge {
  background: linear-gradient(135deg, var(--primary-color), var(--warning-color));
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.source-preview {
  max-width: 350px;
  max-height: 50px;
  overflow: hidden;
}

.source-preview pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-text-2);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 分页样式优化 */
.pagination-wrapper {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: var(--gray-50);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  position: sticky;
  bottom: 0;
  z-index: 5;
}

/* 无限滚动加载指示器 */
.virtual-scroll-container {
  position: relative;
}
</style>