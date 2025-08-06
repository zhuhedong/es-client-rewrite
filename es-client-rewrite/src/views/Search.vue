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
                <a-textarea 
                  v-model="queryText"
                  placeholder="请输入查询JSON"
                  :rows="10"
                  :auto-size="{ minRows: 8, maxRows: 20 }"
                />
              </a-form-item>

              <a-form-item label="排序条件（JSON，可选）">
                <a-textarea 
                  v-model="sortText"
                  placeholder="请输入排序JSON"
                  :rows="3"
                  :auto-size="{ minRows: 3, maxRows: 8 }"
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
                  <a-table 
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

                <!-- JSON视图 -->
                <a-tab-pane key="json" title="JSON视图">
                  <pre class="json-result">{{ JSON.stringify(searchResult, null, 2) }}</pre>
                </a-tab-pane>
              </a-tabs>

              <!-- 分页 -->
              <div class="pagination-wrapper">
                <a-pagination 
                  :current="Math.floor((queryForm.from || 0) / (queryForm.size || 10)) + 1"
                  :page-size="queryForm.size || 10"
                  :total="searchResult.total"
                  @change="onPageChange"
                  show-total
                  show-jumper
                  show-page-size
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
import { ref, computed, onMounted, watch } from 'vue'
import { useConnectionStore } from '../stores/connection'
import { useIndexStore } from '../stores/index'
import { useSearchStore } from '../stores/search'
import { IconSearch, IconDelete } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'

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

const searchResult = computed(() => searchStore.searchResult)

// 查询模板
const templates = {
  match_all: '{\n  "match_all": {}\n}',
  match: '{\n  "match": {\n    "field_name": "search_value"\n  }\n}',
  range: '{\n  "range": {\n    "field_name": {\n      "gte": 10,\n      "lte": 20\n    }\n  }\n}',
  bool: '{\n  "bool": {\n    "must": [\n      { "match": { "field1": "value1" } }\n    ],\n    "filter": [\n      { "term": { "field2": "value2" } }\n    ]\n  }\n}'
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

const onPageChange = (page: number, pageSize: number) => {
  queryForm.value.from = (page - 1) * pageSize
  queryForm.value.size = pageSize
  executeSearch()
}
</script>

<style scoped>
.search-page {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.no-connection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.search-content {
  height: calc(100% - 80px);
}

.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-stats {
  color: #666;
  font-size: 12px;
  font-weight: normal;
}

.no-result {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.source-data {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  max-height: 200px;
  overflow: auto;
  margin: 0;
}

.json-result {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  max-height: 600px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>