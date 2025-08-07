<template>
  <div class="easy-search-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>📊 智能数据查询</h1>
        <p class="subtitle">无需编写复杂查询语句，通过可视化界面轻松查询数据</p>
      </div>
      <div class="header-right">
        <a-space>
          <a-button @click="switchToAdvanced" ghost>
            <template #icon>
              <icon-code />
            </template>
            高级查询
          </a-button>
          <a-button 
            @click="executeQuery" 
            :loading="searchStore.loading" 
            type="primary" 
            size="large"
            :disabled="!canExecuteQuery"
          >
            <template #icon>
              <icon-search />
            </template>
            开始查询
          </a-button>
        </a-space>
      </div>
    </div>

    <div v-if="!connectionStore.currentConnection" class="no-connection">
      <a-empty description="请先选择一个连接">
        <template #image>
          <icon-link :size="100" />
        </template>
      </a-empty>
    </div>

    <div v-else class="query-builder">
      <!-- 步骤指引 -->
      <div class="steps-guide">
        <a-steps :current="currentStep" size="small">
          <a-step title="选择数据源" description="选择要查询的索引" />
          <a-step title="设置筛选条件" description="添加查询条件" />
          <a-step title="配置显示选项" description="排序和分页" />
          <a-step title="查看结果" description="执行查询并查看数据" />
        </a-steps>
      </div>

      <a-row :gutter="24" class="builder-content">
        <!-- 左侧：查询构建器 -->
        <a-col :span="16">
          <div class="query-panels">
            <!-- 步骤1: 数据源选择 -->
            <a-card class="step-card" :class="{ active: currentStep === 0 }">
              <template #title>
                <div class="step-title">
                  <span class="step-number">1</span>
                  <span class="step-text">选择数据源</span>
                </div>
              </template>
              
              <div class="index-selection">
                <a-form-item label="📁 选择索引" required>
                  <a-select
                    v-model="queryBuilder.index"
                    placeholder="请选择要查询的索引"
                    size="large"
                    @change="onIndexChange"
                    @focus="loadIndices"
                  >
                    <a-option
                      v-for="index in indexStore.indices"
                      :key="index.name"
                      :value="index.name"
                    >
                      <div class="index-option">
                        <div class="index-name">{{ index.name }}</div>
                        <div class="index-info">
                          文档数: {{ formatNumber(index.docs_count) }} | 
                          大小: {{ index.store_size || 'N/A' }}
                        </div>
                      </div>
                    </a-option>
                  </a-select>
                </a-form-item>

                <!-- 快速搜索 -->
                <div v-if="queryBuilder.index" class="quick-search">
                  <a-input
                    v-model="quickSearchText"
                    placeholder="🔍 快速搜索所有字段..."
                    size="large"
                    @press-enter="addQuickFilter"
                  >
                    <template #suffix>
                      <a-button 
                        type="text" 
                        @click="addQuickFilter"
                        :disabled="!quickSearchText.trim()"
                      >
                        搜索
                      </a-button>
                    </template>
                  </a-input>
                </div>
              </div>
            </a-card>

            <!-- 步骤2: 筛选条件 -->
            <a-card class="step-card" :class="{ active: currentStep === 1 }">
              <template #title>
                <div class="step-title">
                  <span class="step-number">2</span>
                  <span class="step-text">设置筛选条件</span>
                </div>
              </template>

              <div class="conditions-builder">
                <div class="conditions-header">
                  <h4>📝 查询条件</h4>
                  <a-button size="small" @click="addCondition" type="dashed">
                    <template #icon>
                      <icon-plus />
                    </template>
                    添加条件
                  </a-button>
                </div>

                <div v-if="queryBuilder.conditions.length === 0" class="no-conditions">
                  <a-empty description="暂无查询条件">
                    <template #image>
                      🎯
                    </template>
                    <a-button type="primary" @click="addCondition">添加第一个条件</a-button>
                  </a-empty>
                </div>

                <div v-else class="conditions-list">
                  <div
                    v-for="(condition, index) in queryBuilder.conditions"
                    :key="condition.id"
                    class="condition-item"
                  >
                    <div class="condition-content">
                      <a-input
                        v-model="condition.field"
                        placeholder="字段名"
                        style="width: 120px"
                      />

                      <a-select
                        v-model="condition.type"
                        style="width: 100px"
                      >
                        <a-option value="contains">包含</a-option>
                        <a-option value="equals">等于</a-option>
                        <a-option value="starts_with">开头</a-option>
                        <a-option value="ends_with">结尾</a-option>
                      </a-select>

                      <a-input
                        v-model="condition.value"
                        placeholder="输入值"
                        style="width: 150px"
                      />

                      <a-button
                        type="text"
                        status="danger"
                        @click="removeCondition(index)"
                        size="small"
                      >
                        <template #icon>
                          <icon-delete />
                        </template>
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>
            </a-card>

            <!-- 步骤3: 显示配置 -->
            <a-card class="step-card" :class="{ active: currentStep === 2 }">
              <template #title>
                <div class="step-title">
                  <span class="step-number">3</span>
                  <span class="step-text">配置显示选项</span>
                </div>
              </template>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="📊 显示数量">
                    <a-select v-model="queryBuilder.size" size="large">
                      <a-option :value="10">10 条</a-option>
                      <a-option :value="20">20 条</a-option>
                      <a-option :value="50">50 条</a-option>
                      <a-option :value="100">100 条</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="🔢 开始位置">
                    <a-input-number
                      v-model="queryBuilder.from"
                      :min="0"
                      :step="queryBuilder.size"
                      placeholder="0"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-card>
          </div>
        </a-col>

        <!-- 右侧：查询预览 -->
        <a-col :span="8">
          <div class="preview-panel">
            <a-card title="🔍 查询预览" class="preview-card">
              <div class="query-summary">
                <div class="summary-item">
                  <span class="label">数据源:</span>
                  <span class="value">{{ queryBuilder.index || '未选择' }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">条件数:</span>
                  <span class="value">{{ queryBuilder.conditions.length }} 个</span>
                </div>
                <div class="summary-item">
                  <span class="label">显示:</span>
                  <span class="value">{{ queryBuilder.size }} 条</span>
                </div>
              </div>
            </a-card>

            <a-card title="⚡ 快速操作" class="actions-card">
              <a-space direction="vertical" style="width: 100%">
                <a-button @click="resetQuery" block>
                  <template #icon>
                    <icon-refresh />
                  </template>
                  重置查询
                </a-button>
                <a-button @click="executeQuery" type="primary" block :disabled="!canExecuteQuery">
                  <template #icon>
                    <icon-search />
                  </template>
                  执行查询
                </a-button>
              </a-space>
            </a-card>
          </div>
        </a-col>
      </a-row>

      <!-- 查询结果 -->
      <div v-if="searchResult && searchResult.hits && searchResult.hits.length > 0" class="results-section">
        <a-card title="📋 查询结果" class="results-card">
          <template #extra>
            <span class="result-stats">
              共 {{ searchResult.total }} 条记录，耗时 {{ searchResult.took }}ms
              (第 {{ currentPage }} 页，共 {{ Math.ceil(searchResult.total / queryBuilder.size) }} 页)
            </span>
          </template>

          <a-table
            :data="searchResult.hits"
            :pagination="false"
            :scroll="{ x: '100%' }"
            size="small"
            :loading="searchStore.loading"
          >
            <template #columns>
              <a-table-column title="ID" data-index="_id" :width="150" ellipsis />
              <a-table-column title="评分" data-index="_score" :width="80" />
              <a-table-column title="数据">
                <template #cell="{ record }">
                  <pre class="source-data">{{ JSON.stringify(record._source, null, 2) }}</pre>
                </template>
              </a-table-column>
            </template>
          </a-table>

          <div v-if="searchResult.total > queryBuilder.size" class="pagination-wrapper">
            <a-pagination
              :current="currentPage"
              :page-size="queryBuilder.size"
              :total="searchResult.total"
              @change="onPageChange"
              @page-size-change="onPageSizeChange"
              show-total
              show-jumper
              show-page-size
              :page-size-options="['10', '20', '50', '100']"
            />
          </div>
        </a-card>
      </div>

      <!-- 空结果状态 -->
      <div v-else-if="searchResult && searchResult.hits && searchResult.hits.length === 0" class="results-section">
        <a-card title="📋 查询结果" class="results-card">
          <div class="no-results">
            <a-empty description="没有找到匹配的数据">
              <template #image>
                📭
              </template>
              <a-button @click="resetQuery">重置查询条件</a-button>
            </a-empty>
          </div>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '../stores/connection'
import { useIndexStore } from '../stores/index'
import { useSearchStore } from '../stores/search'
import {
  IconSearch,
  IconCode,
  IconPlus,
  IconDelete,
  IconRefresh,
  IconLink
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'

// 类型定义
interface QueryCondition {
  id: number
  field: string
  type: 'contains' | 'equals' | 'starts_with' | 'ends_with'
  value: string
}

interface QueryBuilder {
  index: string
  conditions: QueryCondition[]
  size: number
  from: number
}

const router = useRouter()
const connectionStore = useConnectionStore()
const indexStore = useIndexStore()
const searchStore = useSearchStore()

// 响应式数据
const currentStep = ref(0)
const quickSearchText = ref('')

// 查询构建器状态
const queryBuilder = ref<QueryBuilder>({
  index: '',
  conditions: [],
  size: 20,
  from: 0
})

let conditionIdCounter = 0

// 计算属性
const searchResult = computed(() => searchStore.searchResult)

const canExecuteQuery = computed(() => {
  return queryBuilder.value.index && connectionStore.currentConnection
})

const currentPage = computed(() => {
  return Math.floor(queryBuilder.value.from / queryBuilder.value.size) + 1
})

// 方法
const loadIndices = async () => {
  if (!connectionStore.currentConnection) return
  await indexStore.fetchIndices(connectionStore.currentConnection.id)
}

const onIndexChange = async (indexName: string) => {
  currentStep.value = Math.max(currentStep.value, 1)
}

const addQuickFilter = () => {
  if (!quickSearchText.value.trim()) return
  
  addCondition()
  const lastCondition = queryBuilder.value.conditions[queryBuilder.value.conditions.length - 1]
  lastCondition.field = '_all'
  lastCondition.type = 'contains'
  lastCondition.value = quickSearchText.value.trim()
  
  quickSearchText.value = ''
  currentStep.value = Math.max(currentStep.value, 2)
  Message.success('已添加全文搜索条件')
}

const addCondition = () => {
  queryBuilder.value.conditions.push({
    id: ++conditionIdCounter,
    field: '',
    type: 'contains',
    value: ''
  })
  currentStep.value = Math.max(currentStep.value, 1)
}

const removeCondition = (index: number) => {
  queryBuilder.value.conditions.splice(index, 1)
}

const executeQuery = async () => {
  if (!canExecuteQuery.value) {
    Message.error('请先选择索引')
    return
  }
  
  try {
    let query = {}
    
    if (queryBuilder.value.conditions.length === 0) {
      query = { match_all: {} }
    } else {
      const conditions = []
      
      for (const condition of queryBuilder.value.conditions) {
        if (!condition.field || !condition.value) continue
        
        let conditionQuery = {}
        
        switch (condition.type) {
          case 'equals':
            conditionQuery = { term: { [condition.field]: condition.value } }
            break
          case 'contains':
            conditionQuery = condition.field === '_all' 
              ? { query_string: { query: condition.value } }
              : { match: { [condition.field]: condition.value } }
            break
          case 'starts_with':
            conditionQuery = { prefix: { [condition.field]: condition.value } }
            break
          case 'ends_with':
            conditionQuery = { wildcard: { [condition.field]: `*${condition.value}` } }
            break
        }
        
        conditions.push(conditionQuery)
      }
      
      if (conditions.length === 1) {
        query = conditions[0]
      } else if (conditions.length > 1) {
        query = { bool: { must: conditions } }
      } else {
        query = { match_all: {} }
      }
    }
    
    const searchQuery = {
      index: queryBuilder.value.index,
      query,
      from: queryBuilder.value.from,
      size: queryBuilder.value.size
    }
    
    await searchStore.executeSearch(connectionStore.currentConnection!.id, searchQuery)
    currentStep.value = 3
    Message.success('查询执行成功！')
  } catch (error) {
    console.error('Search failed:', error)
    Message.error('查询执行失败，请检查查询条件')
  }
}

const resetQuery = () => {
  queryBuilder.value = {
    index: queryBuilder.value.index,
    conditions: [],
    size: 20,
    from: 0
  }
  quickSearchText.value = ''
  currentStep.value = queryBuilder.value.index ? 1 : 0
  searchStore.resetSearchResult()
  Message.info('查询条件已重置')
}

const switchToAdvanced = () => {
  router.push('/search')
}

const onPageChange = (page: number) => {
  console.log('Page change:', page, 'Size:', queryBuilder.value.size)
  
  // 确保页数有效
  if (page < 1) page = 1
  
  queryBuilder.value.from = (page - 1) * queryBuilder.value.size
  
  console.log('New from:', queryBuilder.value.from)
  executeQuery()
}

const onPageSizeChange = (pageSize: number) => {
  console.log('Page size change:', pageSize)
  
  // 确保页大小有效
  if (pageSize < 1) pageSize = 10
  if (pageSize > 1000) pageSize = 1000
  
  const oldSize = queryBuilder.value.size
  queryBuilder.value.size = pageSize
  
  // 尽量保持当前查看的数据位置
  const currentFirstRecord = queryBuilder.value.from + 1
  queryBuilder.value.from = Math.floor((currentFirstRecord - 1) / pageSize) * pageSize
  
  console.log('Size changed from', oldSize, 'to', pageSize, 'new from:', queryBuilder.value.from)
  executeQuery()
}

const formatNumber = (num?: number) => {
  if (num === undefined || num === null) return 'N/A'
  return num.toLocaleString()
}

// 生命周期
onMounted(() => {
  if (connectionStore.currentConnection) {
    loadIndices()
  }
})

// 监听连接变化
watch(
  () => connectionStore.currentConnection,
  (newConnection) => {
    if (newConnection) {
      loadIndices()
    }
  }
)
</script>

<style scoped>
.easy-search-page {
  height: 100%;
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, var(--primary-color), var(--info-color));
  color: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.header-left h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.subtitle {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
  font-size: 0.875rem;
}

.header-right {
  align-self: flex-start;
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

.query-builder {
  background: var(--gray-50);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
}

.steps-guide {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.builder-content {
  min-height: 600px;
}

.query-panels {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.step-card.active {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.step-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 600;
}

.step-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-800);
}

.index-selection {
  max-width: 100%;
}

.index-option {
  padding: 0.5rem 0;
}

.index-name {
  font-weight: 600;
  color: var(--gray-800);
}

.index-info {
  font-size: 0.75rem;
  color: var(--gray-500);
  margin-top: 0.25rem;
}

.quick-search {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--gray-50);
  border-radius: var(--radius);
}

.conditions-builder {
  background: white;
  padding: 1rem;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.conditions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--gray-200);
}

.conditions-header h4 {
  margin: 0;
  color: var(--gray-700);
  font-size: 1rem;
}

.no-conditions {
  text-align: center;
  padding: 2rem 1rem;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.condition-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.condition-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--gray-50);
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.preview-panel {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: fit-content;
}

.preview-card,
.actions-card {
  box-shadow: var(--shadow-sm);
}

.query-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--gray-100);
}

.summary-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: var(--gray-600);
  font-size: 0.875rem;
}

.value {
  font-weight: 600;
  color: var(--gray-800);
}

.results-section {
  margin-top: 2rem;
}

.results-card {
  box-shadow: var(--shadow-md);
}

.result-stats {
  color: var(--gray-600);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  background: var(--gray-100);
  border-radius: var(--radius);
}

.no-results {
  text-align: center;
  padding: 3rem 1rem;
}

.source-data {
  background: var(--gray-50);
  padding: 0.75rem;
  border-radius: var(--radius);
  font-size: 0.75rem;
  line-height: 1.4;
  max-height: 150px;
  overflow: auto;
  margin: 0;
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

@media (max-width: 1200px) {
  .builder-content {
    flex-direction: column;
  }
  
  .preview-panel {
    position: static;
    order: -1;
  }
}
</style>