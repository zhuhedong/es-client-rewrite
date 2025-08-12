<template>
  <div class="search-page">
    <div class="page-header">
      <div class="header-left">
        <h1>📊 数据查询</h1>
        <p class="subtitle">强大的Elasticsearch数据查询工具</p>
      </div>
      <div class="header-right">
        <a-space>
          <a-segmented 
            v-model="queryMode" 
            :options="queryModeOptions"
            size="large"
            @change="onQueryModeChange"
          />
          <a-button @click="executeSearch" :loading="searchStore.loading" type="primary" size="large">
            <template #icon>
              <icon-search />
            </template>
            执行查询
          </a-button>
          <a-button @click="clearResults" size="large">
            <template #icon>
              <icon-delete />
            </template>
            清空结果
          </a-button>
        </a-space>
      </div>
    </div>

    <div v-if="!connectionStore.currentConnection" class="no-connection">
      <a-empty description="请先选择一个连接" />
    </div>

    <div v-else class="search-content">
      <!-- 上半部分：查询配置和查询条件 -->
      <div class="query-row">
        <a-row :gutter="24">
          <!-- 查询配置区域 -->
          <a-col :span="12">
            <a-card class="config-card">
              <template #title>
                <div class="card-title">
                  <icon-filter />
                  <span>查询配置</span>
                </div>
              </template>
              
              <a-form :model="queryForm" layout="vertical">
                <a-form-item label="索引名称" required>
                  <a-select 
                    v-model="queryForm.index" 
                    placeholder="选择索引"
                    allow-search
                    size="large"
                    @focus="loadIndices"
                    @change="onIndexChange"
                  >
                    <a-option 
                      v-for="index in indexStore.indices" 
                      :key="index.name" 
                      :value="index.name"
                    >
                      <div class="index-option">
                        <div class="index-name">{{ index.name }}</div>
                        <div class="index-info">
                          文档: {{ formatNumber(index.docs_count || 0) }} | 
                          大小: {{ index.store_size || 'N/A' }}
                        </div>
                      </div>
                    </a-option>
                  </a-select>
                </a-form-item>

                <a-row :gutter="12">
                  <a-col :span="12">
                    <a-form-item label="起始位置">
                      <a-input-number 
                        v-model="queryForm.from" 
                        :min="0" 
                        placeholder="0"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="返回数量">
                      <a-input-number 
                        v-model="queryForm.size" 
                        :min="1" 
                        :max="10000"
                        placeholder="10"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
              </a-form>
            </a-card>
          </a-col>

          <!-- 简单查询或高级查询区域 -->
          <a-col :span="12">
            <!-- 简单查询模式 -->
            <a-card v-if="queryMode === 'simple'" class="simple-query-card">
              <template #title>
                <div class="card-title">
                  <icon-search />
                  <span>简单查询</span>
                </div>
              </template>
              
              <!-- 快速搜索 -->
              <div class="quick-search">
                <a-input
                  v-model="simpleQuery.quickSearch"
                  placeholder="🔍 搜索所有字段..."
                  size="large"
                  @press-enter="addQuickFilter"
                >
                  <template #suffix>
                    <a-button 
                      type="text" 
                      @click="addQuickFilter"
                      :disabled="!simpleQuery.quickSearch"
                    >
                      <icon-plus />
                    </a-button>
                  </template>
                </a-input>
              </div>

              <!-- 条件列表 -->
              <div class="conditions-list" style="margin-top: 1rem;">
                <div class="section-header">
                  <h4>查询条件</h4>
                  <a-button size="small" @click="showAddConditionModal" type="dashed">
                    <template #icon>
                      <icon-plus />
                    </template>
                    添加条件
                  </a-button>
                </div>
                
                <div class="conditions">
                  <div 
                    v-for="(condition, index) in simpleQuery.conditions" 
                    :key="condition.id"
                    class="condition-item"
                  >
                    <div class="condition-content">
                      <a-tag :color="getConditionTypeColor(condition.type)">
                        {{ getConditionTypeLabel(condition.type) }}
                      </a-tag>
                      <span class="field-name">{{ condition.field }}</span>
                      <span class="operator">{{ getOperatorLabel(condition.operator) }}</span>
                      <span class="condition-value">{{ condition.value }}</span>
                    </div>
                    <a-button 
                      type="text" 
                      status="danger" 
                      @click="removeCondition(index)"
                      size="small"
                    >
                      <template #icon>
                        <icon-close />
                      </template>
                    </a-button>
                  </div>
                  
                  <div v-if="simpleQuery.conditions.length === 0" class="empty-conditions">
                    <a-empty description="暂无查询条件" :image-style="{height: '60px'}">
                      <template #image>
                        <icon-filter :size="60" />
                      </template>
                    </a-empty>
                  </div>
                </div>
              </div>

              <!-- 排序设置 -->
              <div class="sort-section" style="margin-top: 1rem;">
                <div class="section-header">
                  <h4>排序设置</h4>
                  <a-button size="small" @click="addSort" type="dashed">
                    <template #icon>
                      <icon-plus />
                    </template>
                    添加排序
                  </a-button>
                </div>
                
                <div class="sort-list">
                  <div 
                    v-for="(sort, index) in simpleQuery.sort" 
                    :key="index"
                    class="sort-item"
                  >
                    <a-select v-model="sort.field" placeholder="选择字段" style="flex: 1;">
                      <a-option v-for="field in availableFields" :key="field" :value="field">
                        {{ field }}
                      </a-option>
                    </a-select>
                    <a-select v-model="sort.order" style="width: 100px;">
                      <a-option value="asc">升序</a-option>
                      <a-option value="desc">降序</a-option>
                    </a-select>
                    <a-button type="text" status="danger" @click="removeSort(index)">
                      <template #icon>
                        <icon-close />
                      </template>
                    </a-button>
                  </div>
                </div>
              </div>
            </a-card>

            <!-- 高级查询模式 -->
            <a-card v-else class="advanced-query-card">
              <template #title>
                <div class="card-title">
                  <icon-code />
                  <span>高级查询</span>
                </div>
              </template>
              
              <a-form-item label="查询条件（JSON）">
                <QueryEditor
                  v-model="queryText"
                  placeholder="请输入查询JSON..."
                  height="200px"
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
                  height="80px"
                  :show-validation="true"
                  :format-on-blur="true"
                  @validation-change="onSortValidationChange"
                />
              </a-form-item>

              <!-- 快速查询模板 -->
              <a-form-item label="快速模板">
                <a-space size="small" wrap>
                  <a-button size="small" @click="setTemplate('match_all')">
                    查询所有
                  </a-button>
                  <a-button size="small" @click="setTemplate('match')">
                    匹配查询
                  </a-button>
                  <a-button size="small" @click="setTemplate('range')">
                    范围查询
                  </a-button>
                  <a-button size="small" @click="setTemplate('bool')">
                    布尔查询
                  </a-button>
                  <a-button size="small" @click="setTemplate('terms_agg')" type="outline">
                    分组聚合
                  </a-button>
                  <a-button size="small" @click="setTemplate('date_histogram')" type="outline">
                    时间聚合
                  </a-button>
                  <a-button size="small" @click="setTemplate('stats_agg')" type="outline">
                    统计聚合
                  </a-button>
                </a-space>
              </a-form-item>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 下半部分：查询结果 -->
      <div class="results-row">
        <a-card class="results-card">
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
                      <a-divider type="vertical" />
                      <span>显示字段：</span>
                      <a-select
                        v-model="selectedFields"
                        multiple
                        :max-tag-count="3"
                        placeholder="选择要显示的字段"
                        style="min-width: 200px"
                        allow-clear
                      >
                        <a-option 
                          v-for="field in extractFieldsFromResults(searchResult.hits)" 
                          :key="field" 
                          :value="field"
                        >
                          {{ field }}
                        </a-option>
                      </a-select>
                      <a-button size="small" @click="selectAllFields" type="outline">
                        全选
                      </a-button>
                      <a-button size="small" @click="clearFieldSelection" type="outline">
                        清空
                      </a-button>
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
                      <span class="metadata-value">{{ record._index }}</span>
                    </template>
                    <template #_type="{ record }">
                      <span class="metadata-value">{{ record._type || '-' }}</span>
                    </template>
                    <template #_id="{ record }">
                      <span class="doc-id">{{ record._id }}</span>
                    </template>
                    <template #_score="{ record }">
                      <span class="score-badge">{{ record._score?.toFixed(3) || 'N/A' }}</span>
                    </template>
                    <!-- 动态字段插槽 -->
                    <template v-for="field in (selectedFields.length > 0 ? selectedFields.filter(f => searchResult?.hits && extractFieldsFromResults(searchResult.hits).includes(f)) : (searchResult?.hits ? extractFieldsFromResults(searchResult.hits).slice(0, 10) : []))" :key="`_source.${field}`" #[`_source.${field}`]="{ record }">
                      <div class="field-cell">
                        <span class="field-value" :title="formatFieldValue(getFieldValue(record._source, field))">
                          {{ formatFieldValue(getFieldValue(record._source, field)) }}
                        </span>
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
                      <a-table-column title="索引" data-index="_index" :width="120">
                        <template #cell="{ record }">
                          <span class="metadata-value">{{ record._index }}</span>
                        </template>
                      </a-table-column>
                      <a-table-column title="类型" data-index="_type" :width="100">
                        <template #cell="{ record }">
                          <span class="metadata-value">{{ record._type || '-' }}</span>
                        </template>
                      </a-table-column>
                      <a-table-column title="ID" data-index="_id" :width="180">
                        <template #cell="{ record }">
                          <span class="doc-id">{{ record._id }}</span>
                        </template>
                      </a-table-column>
                      <a-table-column title="评分" data-index="_score" :width="80">
                        <template #cell="{ record }">
                          <span class="score-badge">{{ record._score?.toFixed(3) || 'N/A' }}</span>
                        </template>
                      </a-table-column>
                      <!-- 动态字段列 -->
                      <a-table-column 
                        v-for="field in (selectedFields.length > 0 ? selectedFields.filter(f => searchResult?.hits && extractFieldsFromResults(searchResult.hits).includes(f)) : (searchResult?.hits ? extractFieldsFromResults(searchResult.hits).slice(0, 10) : []))" 
                        :key="field"
                        :title="field"
                        :width="parseInt(getOptimalColumnWidth(field, searchResult?.hits || []))"
                      >
                        <template #cell="{ record }">
                          <div class="field-cell">
                            <span 
                              class="field-value" 
                              :title="formatFieldValue(getFieldValue(record._source, field))"
                            >
                              {{ formatFieldValue(getFieldValue(record._source, field)) }}
                            </span>
                          </div>
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
      </div>
    </div>

    <!-- 添加条件弹窗 -->
    <a-modal
      v-model:visible="addConditionModalVisible"
      title="添加查询条件"
      @ok="handleAddCondition"
      @cancel="resetConditionForm"
      :ok-button-props="{ disabled: !isConditionFormValid }"
      width="600px"
    >
        <a-form :model="conditionForm" layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="字段名称" required>
                <a-select 
                  v-model="conditionForm.field" 
                  placeholder="选择字段"
                  allow-search
                  @change="onFieldChange"
                >
                  <a-option v-for="field in availableFields" :key="field" :value="field">
                    {{ field }}
                  </a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="条件类型" required>
                <a-select v-model="conditionForm.type" @change="onConditionTypeChange">
                  <a-option value="match">匹配查询</a-option>
                  <a-option value="term">精确匹配</a-option>
                  <a-option value="range">范围查询</a-option>
                  <a-option value="wildcard">通配符查询</a-option>
                  <a-option value="exists">字段存在</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          
          <a-row :gutter="16" v-if="conditionForm.type !== 'exists'">
            <a-col :span="12">
              <a-form-item label="操作符" required>
                <a-select v-model="conditionForm.operator">
                  <a-option v-for="op in availableOperators" :key="op.value" :value="op.value">
                    {{ op.label }}
                  </a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="值" required>
                <a-input 
                  v-if="conditionForm.type !== 'range'"
                  v-model="conditionForm.value" 
                  placeholder="输入值"
                />
                <div v-else class="range-inputs">
                  <a-input 
                    v-model="conditionForm.rangeFrom" 
                    placeholder="最小值"
                    style="width: 45%"
                  />
                  <span style="width: 10%; text-align: center;">-</span>
                  <a-input 
                    v-model="conditionForm.rangeTo" 
                    placeholder="最大值"
                    style="width: 45%"
                  />
                </div>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useConnectionStore } from '../stores/connection'
import { useIndexStore } from '../stores/index'
import { useSearchStore } from '../stores/search'
import { 
  IconSearch, 
  IconDelete, 
  IconFilter, 
  IconCode, 
  IconPlus, 
  IconClose 
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import VisualizationPanel from '../components/VisualizationPanel.vue'
import JsonEditor from '../components/JsonEditor.vue'
import QueryEditor from '../components/QueryEditor.vue'
import VirtualTable from '../components/VirtualTable.vue'
import { Api } from '../api'

const connectionStore = useConnectionStore()
const indexStore = useIndexStore()
const searchStore = useSearchStore()

// 查询模式
const queryMode = ref('simple')
const queryModeOptions = [
  { label: '🎯 简单查询', value: 'simple' },
  { label: '⚡ 高级查询', value: 'advanced' }
]

const queryForm = ref({
  index: '',
  from: 0,
  size: 10
})

// 高级查询相关
const queryText = ref('{\n  "match_all": {}\n}')
const sortText = ref('')
const queryValid = ref(true)
const sortValid = ref(true)
const queryValidationError = ref('')
const sortValidationError = ref('')

// 简单查询相关
const simpleQuery = ref({
  quickSearch: '',
  conditions: [] as any[],
  sort: [] as any[]
})

// 添加条件弹窗
const addConditionModalVisible = ref(false)
const conditionForm = ref({
  field: '',
  type: 'match',
  operator: 'eq',
  value: '',
  rangeFrom: '',
  rangeTo: ''
})

// 可用字段
const availableFields = ref<string[]>([])

// 搜索结果
const searchResult = computed(() => searchStore.searchResult)
const viewMode = ref('pagination')

// 字段选择
const selectedFields = ref<string[]>([])

// 虚拟滚动的数据管理
const allData = ref<any[]>([])
const isLoadingMore = ref(false)

// 动态表格列定义
const tableColumns = computed(() => {
  if (!searchResult.value || !searchResult.value.hits || searchResult.value.hits.length === 0) {
    return [
      { key: '_index', title: '索引', width: '120px' },
      { key: '_type', title: '类型', width: '100px' },
      { key: '_id', title: 'ID', width: '150px' },
      { key: '_score', title: '评分', width: '80px' }
    ]
  }

  // 从搜索结果中提取所有字段
  const allSourceFields = extractFieldsFromResults(searchResult.value.hits)
  
  // 根据用户选择决定显示哪些字段
  const fieldsToShow = selectedFields.value.length > 0 
    ? selectedFields.value.filter(field => allSourceFields.includes(field))
    : allSourceFields.slice(0, 10) // 默认显示前10个字段
  
  // 基础元数据列
  const baseColumns = [
    { key: '_index', title: '索引', width: '120px' },
    { key: '_type', title: '类型', width: '100px' },
    { key: '_id', title: 'ID', width: '180px' },
    { key: '_score', title: '评分', width: '80px' }
  ]
  
  // 动态字段列
  const fieldColumns = fieldsToShow.map(field => ({
    key: `_source.${field}`,
    title: field,
    width: getOptimalColumnWidth(field, searchResult.value!.hits)
  }))
  
  return [...baseColumns, ...fieldColumns]
})

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

// 可视化组件的key
const visualizationKey = ref(0)

// 计算当前页数
const currentPage = computed(() => {
  const from = queryForm.value.from || 0
  const size = queryForm.value.size || 10
  return Math.floor(from / size) + 1
})

// 条件表单验证
const isConditionFormValid = computed(() => {
  if (!conditionForm.value.field || !conditionForm.value.type) return false
  if (conditionForm.value.type === 'exists') return true
  if (conditionForm.value.type === 'range') {
    return conditionForm.value.rangeFrom && conditionForm.value.rangeTo
  }
  return conditionForm.value.value
})

// 可用操作符
const availableOperators = computed(() => {
  const type = conditionForm.value.type
  switch (type) {
    case 'match':
    case 'wildcard':
      return [
        { label: '包含', value: 'contains' },
        { label: '不包含', value: 'not_contains' }
      ]
    case 'term':
      return [
        { label: '等于', value: 'eq' },
        { label: '不等于', value: 'neq' }
      ]
    case 'range':
      return [
        { label: '范围', value: 'range' }
      ]
    default:
      return [{ label: '等于', value: 'eq' }]
  }
})

// 数字格式化
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num?.toString() || '0'
}

// 查询模板
const templates = {
  match_all: '{\n  "match_all": {}\n}',
  match: '{\n  "match": {\n    "field_name": "search_value"\n  }\n}',
  range: '{\n  "range": {\n    "field_name": {\n      "gte": 10,\n      "lte": 20\n    }\n  }\n}',
  bool: '{\n  "bool": {\n    "must": [\n      { "match": { "field1": "value1" } }\n    ],\n    "filter": [\n      { "term": { "field2": "value2" } }\n    ]\n  }\n}',
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
    if (queryMode.value === 'advanced') {
      queryText.value = JSON.stringify(searchStore.query.query, null, 2)
    }
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

// 新增方法

// 查询模式切换
const onQueryModeChange = (mode: string) => {
  queryMode.value = mode
  if (mode === 'simple') {
    // 切换到简单模式时，尝试解析当前的JSON查询
    try {
      const query = JSON.parse(queryText.value)
      // 简单的转换逻辑
      if (query.match_all) {
        simpleQuery.value.conditions = []
      }
    } catch (e) {
      // 解析失败时重置简单查询
      simpleQuery.value = {
        quickSearch: '',
        conditions: [],
        sort: []
      }
    }
  } else {
    // 切换到高级模式时，将简单查询转换为JSON
    if (simpleQuery.value.conditions.length > 0) {
      const query = buildQueryFromConditions()
      queryText.value = JSON.stringify(query, null, 2)
    }
  }
}

// 索引变化时加载字段映射
const onIndexChange = async (indexName: string) => {
  if (!connectionStore.currentConnection || !indexName) return
  
  try {
    const mapping = await Api.getIndexMapping(connectionStore.currentConnection.id, indexName)
    // 解析字段映射
    availableFields.value = extractFieldsFromMapping(mapping)
  } catch (error) {
    console.error('Failed to load field mapping:', error)
    availableFields.value = []
  }
}

// 从映射中提取字段
const extractFieldsFromMapping = (mapping: any): string[] => {
  const fields: string[] = []
  
  const traverse = (obj: any, prefix = '') => {
    for (const key in obj) {
      if (key === 'properties') {
        traverse(obj[key], prefix)
      } else if (typeof obj[key] === 'object' && obj[key].type) {
        const fieldName = prefix ? `${prefix}.${key}` : key
        fields.push(fieldName)
        if (obj[key].properties) {
          traverse(obj[key].properties, fieldName)
        }
      }
    }
  }
  
  if (mapping && typeof mapping === 'object') {
    Object.keys(mapping).forEach(indexName => {
      if (mapping[indexName] && mapping[indexName].mappings) {
        traverse(mapping[indexName].mappings)
      }
    })
  }
  
  return [...new Set(fields)].sort()
}

// 从搜索结果中提取所有字段
const extractFieldsFromResults = (hits: any[]): string[] => {
  const fieldSet = new Set<string>()
  
  const traverseObject = (obj: any, prefix = '') => {
    if (!obj || typeof obj !== 'object') return
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key
        const value = obj[key]
        
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            fieldSet.add(fieldPath)
            // 如果数组中有对象，递归处理
            if (value.length > 0 && typeof value[0] === 'object') {
              traverseObject(value[0], fieldPath)
            }
          } else if (typeof value === 'object') {
            // 对于嵌套对象，既添加父字段也递归处理子字段
            fieldSet.add(fieldPath)
            traverseObject(value, fieldPath)
          } else {
            fieldSet.add(fieldPath)
          }
        }
      }
    }
  }
  
  // 分析前20条记录以获取字段结构
  const sampleSize = Math.min(hits.length, 20)
  for (let i = 0; i < sampleSize; i++) {
    if (hits[i]._source) {
      traverseObject(hits[i]._source)
    }
  }
  
  return Array.from(fieldSet).sort()
}

// 计算最佳列宽
const getOptimalColumnWidth = (fieldName: string, hits: any[]): string => {
  // 基于字段名称长度的基础宽度
  const fieldNameLength = fieldName.length
  let baseWidth = Math.max(80, fieldNameLength * 8 + 40)
  
  // 分析字段值的长度（样本前10条记录）
  const sampleSize = Math.min(hits.length, 10)
  let maxValueLength = 0
  
  for (let i = 0; i < sampleSize; i++) {
    const value = getFieldValue(hits[i]._source, fieldName)
    if (value !== null && value !== undefined) {
      const stringValue = formatFieldValue(value)
      maxValueLength = Math.max(maxValueLength, stringValue.length)
    }
  }
  
  // 根据值的长度调整宽度
  const contentWidth = Math.max(baseWidth, maxValueLength * 8 + 40)
  
  // 设置最小和最大宽度限制
  const finalWidth = Math.max(80, Math.min(300, contentWidth))
  
  return `${finalWidth}px`
}

// 获取嵌套字段的值
const getFieldValue = (obj: any, fieldPath: string): any => {
  if (!obj || !fieldPath) return null
  
  const keys = fieldPath.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return null
    }
  }
  
  return current
}

// 格式化字段值用于显示
const formatFieldValue = (value: any): string => {
  if (value === null || value === undefined) {
    return ''
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.length === 1) return formatFieldValue(value[0])
    return `[${value.length} items]`
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 0)
  }
  
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 97) + '...'
  }
  
  return String(value)
}

// 快速搜索
const addQuickFilter = () => {
  if (!simpleQuery.value.quickSearch.trim()) return
  
  const condition = {
    id: Date.now().toString(),
    field: '_all',
    type: 'match',
    operator: 'contains',
    value: simpleQuery.value.quickSearch.trim()
  }
  
  simpleQuery.value.conditions.push(condition)
  simpleQuery.value.quickSearch = ''
}

// 显示添加条件弹窗
const showAddConditionModal = () => {
  resetConditionForm()
  addConditionModalVisible.value = true
}

// 重置条件表单
const resetConditionForm = () => {
  conditionForm.value = {
    field: '',
    type: 'match',
    operator: 'eq',
    value: '',
    rangeFrom: '',
    rangeTo: ''
  }
}

// 处理添加条件
const handleAddCondition = () => {
  if (!isConditionFormValid.value) return
  
  const condition = {
    id: Date.now().toString(),
    field: conditionForm.value.field,
    type: conditionForm.value.type,
    operator: conditionForm.value.operator,
    value: conditionForm.value.type === 'range' 
      ? `${conditionForm.value.rangeFrom} - ${conditionForm.value.rangeTo}`
      : conditionForm.value.value
  }
  
  simpleQuery.value.conditions.push(condition)
  addConditionModalVisible.value = false
  resetConditionForm()
}

// 移除条件
const removeCondition = (index: number) => {
  simpleQuery.value.conditions.splice(index, 1)
}

// 添加排序
const addSort = () => {
  simpleQuery.value.sort.push({
    field: '',
    order: 'desc'
  })
}

// 移除排序
const removeSort = (index: number) => {
  simpleQuery.value.sort.splice(index, 1)
}

// 字段变化
const onFieldChange = () => {
  conditionForm.value.operator = availableOperators.value[0]?.value || 'eq'
}

// 条件类型变化
const onConditionTypeChange = () => {
  conditionForm.value.operator = availableOperators.value[0]?.value || 'eq'
  conditionForm.value.value = ''
  conditionForm.value.rangeFrom = ''
  conditionForm.value.rangeTo = ''
}

// 获取条件类型颜色
const getConditionTypeColor = (type: string) => {
  const colors = {
    match: 'blue',
    term: 'green',
    range: 'orange',
    wildcard: 'purple',
    exists: 'cyan'
  }
  return colors[type as keyof typeof colors] || 'gray'
}

// 获取条件类型标签
const getConditionTypeLabel = (type: string) => {
  const labels = {
    match: '匹配',
    term: '精确',
    range: '范围',
    wildcard: '通配',
    exists: '存在'
  }
  return labels[type as keyof typeof labels] || type
}

// 获取操作符标签
const getOperatorLabel = (operator: string) => {
  const labels = {
    contains: '包含',
    not_contains: '不包含',
    eq: '等于',
    neq: '不等于',
    range: '范围'
  }
  return labels[operator as keyof typeof labels] || operator
}

// 从简单查询条件构建Elasticsearch查询
const buildQueryFromConditions = () => {
  if (simpleQuery.value.conditions.length === 0) {
    return { match_all: {} }
  }
  
  const must: any[] = []
  const filter: any[] = []
  
  simpleQuery.value.conditions.forEach(condition => {
    switch (condition.type) {
      case 'match':
        if (condition.field === '_all') {
          must.push({ multi_match: { query: condition.value, fields: ['*'] } })
        } else {
          must.push({ match: { [condition.field]: condition.value } })
        }
        break
      case 'term':
        const termQuery = { term: { [condition.field + '.keyword']: condition.value } }
        if (condition.operator === 'neq') {
          filter.push({ bool: { must_not: termQuery } })
        } else {
          filter.push(termQuery)
        }
        break
      case 'range':
        const [from, to] = condition.value.split(' - ')
        filter.push({ range: { [condition.field]: { gte: from, lte: to } } })
        break
      case 'wildcard':
        must.push({ wildcard: { [condition.field + '.keyword']: `*${condition.value}*` } })
        break
      case 'exists':
        filter.push({ exists: { field: condition.field } })
        break
    }
  })
  
  if (must.length === 0 && filter.length === 0) {
    return { match_all: {} }
  }
  
  const query: any = { bool: {} }
  if (must.length > 0) query.bool.must = must
  if (filter.length > 0) query.bool.filter = filter
  
  return query
}

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

  let finalQuery: any
  let sort: any = undefined

  try {
    // 根据查询模式构建查询
    if (queryMode.value === 'simple') {
      finalQuery = buildQueryFromConditions()
      
      // 构建排序
      if (simpleQuery.value.sort.length > 0) {
        sort = simpleQuery.value.sort
          .filter(s => s.field && s.order)
          .map(s => ({ [s.field]: { order: s.order } }))
      }
    } else {
      // 高级模式：验证JSON格式
      if (!queryValid.value) {
        Message.error('查询条件JSON格式错误：' + queryValidationError.value)
        return
      }

      if (sortText.value.trim() && !sortValid.value) {
        Message.error('排序条件JSON格式错误：' + sortValidationError.value)
        return
      }

      try {
        finalQuery = JSON.parse(queryText.value)
      } catch (error) {
        Message.error('查询条件JSON格式错误')
        return
      }

      if (sortText.value.trim()) {
        try {
          sort = JSON.parse(sortText.value)
        } catch (error) {
          Message.error('排序条件JSON格式错误')
          return
        }
      }
    }

    const searchQuery = {
      index: queryForm.value.index,
      query: finalQuery,
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
  
  // 更新查询表单的 from 值
  queryForm.value.from = (page - 1) * (queryForm.value.size || 10)
  
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
  
  // 计算当前页码，保持在同一页
  const currentPage = Math.floor((queryForm.value.from || 0) / (queryForm.value.size || 10)) + 1
  
  // 更新页面大小
  queryForm.value.size = pageSize
  
  // 重新计算 from 值以保持在相似位置
  queryForm.value.from = (currentPage - 1) * pageSize
  
  // 确保 from 不超过总记录数
  if (searchResult.value && queryForm.value.from >= searchResult.value.total) {
    queryForm.value.from = Math.max(0, Math.floor((searchResult.value.total - 1) / pageSize) * pageSize)
  }
  
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

// 字段选择器方法
const selectAllFields = () => {
  if (searchResult.value && searchResult.value.hits) {
    selectedFields.value = extractFieldsFromResults(searchResult.value.hits)
  }
}

const clearFieldSelection = () => {
  selectedFields.value = []
}

// 监听搜索结果变化，自动选择前几个字段
watch(searchResult, (newResult) => {
  if (newResult && newResult.hits && newResult.hits.length > 0) {
    const allFields = extractFieldsFromResults(newResult.hits)
    // 如果用户还没有选择字段，默认选择前5个字段
    if (selectedFields.value.length === 0 && allFields.length > 0) {
      selectedFields.value = allFields.slice(0, 5)
    }
  }
}, { immediate: true })

// 监听搜索store的查询状态变化，同步到表单
watch(() => searchStore.query, (newQuery) => {
  if (newQuery && newQuery.index) {
    queryForm.value.index = newQuery.index
    queryForm.value.from = newQuery.from || 0
    queryForm.value.size = newQuery.size || 10
  }
}, { deep: true })

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
  padding: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.header-left h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1890ff, #722ed1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  margin: 0;
  color: var(--color-text-3);
  font-size: 0.875rem;
}

.no-connection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  background: var(--color-fill-1);
  border-radius: 12px;
  border: 2px dashed var(--color-border);
}

.search-content {
  height: calc(100% - 120px);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 查询行样式 */
.query-row {
  flex-shrink: 0;
}

/* 结果行样式 */
.results-row {
  flex: 1;
  min-height: 0;
}

/* 查询配置和简单查询卡片样式 */
.config-card,
.simple-query-card,
.advanced-query-card {
  border-radius: 12px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
  border: 1px solid var(--color-border) !important;
  height: fit-content;
}

.simple-query-card,
.advanced-query-card {
  margin-top: 0 !important;
}

/* 查询结果区域样式 */
.results-card {
  border-radius: 12px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
  border: 1px solid var(--color-border) !important;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.results-card .arco-card-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.results-card .arco-tabs {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.results-card .arco-tabs-content {
  flex: 1;
  overflow: hidden;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--color-text-1);
}

/* 索引选项样式 */
.index-option {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.index-name {
  font-weight: 600;
  color: var(--color-text-1);
}

.index-info {
  font-size: 0.75rem;
  color: var(--color-text-3);
}

/* 简单查询相关样式 */
.quick-search {
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 条件项样式 */
.condition-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--color-fill-1);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.condition-item:hover {
  background: var(--color-fill-2);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.condition-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.field-name {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
}

.operator {
  color: var(--color-text-3);
  font-size: 0.875rem;
}

.condition-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
  background: var(--color-fill-2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-conditions {
  padding: 2rem;
  text-align: center;
}

/* 排序项样式 */
.sort-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: var(--color-fill-1);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

/* 弹窗样式 */
.range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 结果相关样式 */
.result-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.result-stats {
  color: var(--color-text-3);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  background: var(--color-fill-2);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.table-controls {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--color-fill-1);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.data-info {
  color: var(--color-text-3);
  font-size: 0.875rem;
  font-weight: 500;
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
  border-radius: 8px;
  font-size: 0.875rem;
  color: #0369a1;
}

.hint-text kbd {
  background: #1e40af;
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 分页样式 */
.pagination-wrapper {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: var(--color-fill-1);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  position: sticky;
  bottom: 0;
  z-index: 5;
}

/* 表格单元格样式 */
.metadata-value {
  font-size: 0.875rem;
  color: var(--color-text-2);
  font-weight: 500;
}

.field-cell {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0.25rem 0;
}

.field-value {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
  color: var(--color-text-1);
  line-height: 1.4;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-height: 2.8em;
}

.field-value:empty::before {
  content: '-';
  color: var(--color-text-4);
  font-style: italic;
}

/* 虚拟滚动相关样式 */
.doc-id {
  font-family: 'Monaco', 'Menlo', monospace;
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
  background: linear-gradient(135deg, var(--color-primary), #722ed1);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', monospace;
}

.source-preview {
  max-width: 350px;
  max-height: 50px;
  overflow: hidden;
}

.source-preview pre {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-text-2);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.source-data {
  background: var(--color-fill-1);
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.75rem;
  line-height: 1.6;
  max-height: 200px;
  overflow: auto;
  margin: 0;
  border: 1px solid var(--color-border);
  font-family: 'Monaco', 'Menlo', monospace;
}

.json-result {
  background: #1e1e1e;
  color: #e2e8f0;
  padding: 1.5rem;
  border-radius: 8px;
  max-height: 600px;
  overflow: auto;
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
  border: 1px solid #374151;
  font-family: 'Monaco', 'Menlo', monospace;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .autocomplete-hint {
    background: linear-gradient(135deg, #1e3a8a, #1e40af);
    border-color: #3b82f6;
    color: #93c5fd;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .header-left h1 {
    font-size: 1.5rem;
  }
  
  .search-content .arco-col {
    margin-bottom: 1rem;
  }
}
</style>