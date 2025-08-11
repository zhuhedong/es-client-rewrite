<template>
  <div class="query-builder">
    <div class="header">
      <h2>查询构建器</h2>
      <a-space>
        <a-button @click="resetBuilder" type="outline">
          <template #icon>
            <icon-refresh />
          </template>
          重置
        </a-button>
        <a-button @click="executeQuery" type="primary" :loading="queryBuilderStore.executing">
          <template #icon>
            <icon-play-arrow />
          </template>
          执行查询
        </a-button>
      </a-space>
    </div>

    <div class="builder-content">
      <!-- 索引选择 -->
      <div class="index-selection">
        <a-form-item label="选择索引" required>
          <a-select 
            v-model="selectedIndex"
            placeholder="请选择索引"
            @change="handleIndexChange"
            :loading="indexStore.loading"
            allow-search
          >
            <a-option v-for="index in indexStore.indices" :key="index.name" :value="index.name">
              {{ index.name }}
              <template #suffix>
                <a-tag size="small" :color="getHealthColor(index.health)">
                  {{ index.health }}
                </a-tag>
              </template>
            </a-option>
          </a-select>
        </a-form-item>
      </div>

      <!-- 查询构建区域 -->
      <div v-if="selectedIndex" class="query-section">
        <div class="section-header">
          <h3>查询条件</h3>
          <a-button size="small" @click="addRootGroup" type="dashed">
            <template #icon>
              <icon-plus />
            </template>
            添加查询组
          </a-button>
        </div>

        <!-- 查询组 -->
        <div class="query-groups">
          <QueryGroup
            v-for="group in queryBuilderStore.config.groups"
            :key="group.id"
            :group="group"
            :fields="queryBuilderStore.fields"
            :level="0"
            @add-group="handleAddGroup"
            @add-condition="handleAddCondition"
            @remove-group="handleRemoveGroup"
            @remove-condition="handleRemoveCondition"
            @update-group="handleUpdateGroup"
            @update-condition="handleUpdateCondition"
          />

          <!-- 空状态 -->
          <div v-if="queryBuilderStore.config.groups.length === 0" class="empty-state">
            <a-empty description="暂无查询条件">
              <a-button @click="addRootGroup" type="primary">
                创建第一个查询组
              </a-button>
            </a-empty>
          </div>
        </div>
      </div>

      <!-- 排序和分页设置 -->
      <div v-if="selectedIndex" class="options-section">
        <a-row :gutter="24">
          <!-- 排序设置 -->
          <a-col :span="12">
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
                v-for="(sort, index) in queryBuilderStore.config.sort" 
                :key="index" 
                class="sort-item"
              >
                <a-select 
                  v-model="sort.field" 
                  placeholder="选择字段"
                  style="width: 200px"
                  allow-search
                >
                  <a-option v-for="field in sortableFields" :key="field.name" :value="field.name">
                    {{ field.name }}
                    <template #suffix>
                      <a-tag size="small" color="blue">{{ field.type }}</a-tag>
                    </template>
                  </a-option>
                </a-select>
                
                <a-select v-model="sort.order" style="width: 100px">
                  <a-option value="asc">升序</a-option>
                  <a-option value="desc">降序</a-option>
                </a-select>
                
                <a-button size="small" @click="removeSort(index)" type="text" status="danger">
                  <template #icon>
                    <icon-delete />
                  </template>
                </a-button>
              </div>
            </div>
          </a-col>

          <!-- 分页设置 -->
          <a-col :span="12">
            <div class="section-header">
              <h4>分页设置</h4>
            </div>
            
            <div class="pagination-settings">
              <a-form layout="inline">
                <a-form-item label="起始位置">
                  <a-input-number 
                    v-model="queryBuilderStore.config.from" 
                    :min="0" 
                    style="width: 120px"
                  />
                </a-form-item>
                <a-form-item label="返回数量">
                  <a-input-number 
                    v-model="queryBuilderStore.config.size" 
                    :min="1" 
                    :max="10000" 
                    style="width: 120px"
                  />
                </a-form-item>
              </a-form>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- 生成的查询预览 -->
      <div v-if="selectedIndex && queryBuilderStore.generatedQuery.isValid" class="query-preview">
        <div class="section-header">
          <h4>生成的查询</h4>
          <a-button size="small" @click="copyQuery" type="outline">
            <template #icon>
              <icon-copy />
            </template>
            复制查询
          </a-button>
        </div>
        
        <div class="query-json">
          <pre>{{ JSON.stringify(fullQuery, null, 2) }}</pre>
        </div>
      </div>

      <!-- 查询错误 -->
      <div v-if="!queryBuilderStore.generatedQuery.isValid" class="query-errors">
        <a-alert 
          type="error" 
          title="查询配置错误"
          :description="queryBuilderStore.generatedQuery.errors.join(', ')"
        />
      </div>

      <!-- 查询结果 -->
      <div v-if="queryBuilderStore.results" class="results-section">
        <div class="section-header">
          <h4>查询结果</h4>
          <div class="result-stats">
            <a-tag color="green">{{ queryBuilderStore.results.total }} 条记录</a-tag>
            <a-tag color="blue">{{ queryBuilderStore.results.took }}ms</a-tag>
          </div>
        </div>

        <SearchResults :results="queryBuilderStore.results" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQueryBuilderStore } from '../stores/queryBuilder'
import { useIndexStore } from '../stores/index'
import { useConnectionStore } from '../stores/connection'
import QueryGroup from '../components/QueryGroup.vue'
import SearchResults from '../components/SearchResults.vue'
import { Message } from '@arco-design/web-vue'
import {
  IconRefresh,
  IconPlayArrow,
  IconPlus,
  IconDelete,
  IconCopy
} from '@arco-design/web-vue/es/icon'

const queryBuilderStore = useQueryBuilderStore()
const indexStore = useIndexStore()
const connectionStore = useConnectionStore()

const selectedIndex = ref('')

const sortableFields = computed(() => {
  return queryBuilderStore.fields.filter(field => field.aggregatable)
})

const fullQuery = computed(() => {
  const query: any = {
    query: queryBuilderStore.generatedQuery.query
  }
  
  if (queryBuilderStore.config.from !== undefined) {
    query.from = queryBuilderStore.config.from
  }
  
  if (queryBuilderStore.config.size !== undefined) {
    query.size = queryBuilderStore.config.size
  }
  
  if (queryBuilderStore.config.sort && queryBuilderStore.config.sort.length > 0) {
    query.sort = queryBuilderStore.config.sort.map(s => ({
      [s.field]: { order: s.order }
    }))
  }
  
  return query
})

const getHealthColor = (health: string) => {
  switch (health) {
    case 'green': return 'green'
    case 'yellow': return 'orange'
    case 'red': return 'red'
    default: return 'gray'
  }
}

const handleIndexChange = async (index: string) => {
  await queryBuilderStore.setIndex(index)
}

const addRootGroup = () => {
  queryBuilderStore.addGroup()
}

const handleAddGroup = (parentGroupId: string) => {
  queryBuilderStore.addGroup(parentGroupId)
}

const handleAddCondition = (groupId: string) => {
  queryBuilderStore.addCondition(groupId)
}

const handleRemoveGroup = (groupId: string) => {
  queryBuilderStore.removeGroup(groupId)
}

const handleRemoveCondition = (groupId: string, conditionId: string) => {
  queryBuilderStore.removeCondition(groupId, conditionId)
}

const handleUpdateGroup = (groupId: string, updates: any) => {
  const group = queryBuilderStore.findGroupById(queryBuilderStore.config.groups, groupId)
  if (group) {
    Object.assign(group, updates)
  }
}

const handleUpdateCondition = (groupId: string, conditionId: string, updates: any) => {
  const group = queryBuilderStore.findGroupById(queryBuilderStore.config.groups, groupId)
  if (group) {
    const condition = group.conditions.find(c => c.id === conditionId)
    if (condition) {
      Object.assign(condition, updates)
      
      // 根据字段类型自动设置数据类型
      if (updates.field) {
        const field = queryBuilderStore.fields.find(f => f.name === updates.field)
        if (field) {
          condition.dataType = field.type
        }
      }
    }
  }
}

const addSort = () => {
  queryBuilderStore.addSort()
}

const removeSort = (index: number) => {
  queryBuilderStore.removeSort(index)
}

const executeQuery = async () => {
  await queryBuilderStore.executeQuery()
}

const resetBuilder = () => {
  queryBuilderStore.resetConfig()
  selectedIndex.value = ''
}

const copyQuery = () => {
  navigator.clipboard.writeText(JSON.stringify(fullQuery.value, null, 2))
  Message.success('查询已复制到剪贴板')
}

onMounted(async () => {
  if (connectionStore.currentConnection) {
    await indexStore.fetchIndices(connectionStore.currentConnection.id)
  }
})
</script>

<style scoped>
.query-builder {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gray-200);
}

.header h2 {
  color: var(--gray-800);
  font-weight: 600;
  margin: 0;
}

.builder-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.index-selection {
  background: var(--gray-50);
  padding: 1rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
}

.query-section {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3,
.section-header h4 {
  margin: 0;
  color: var(--gray-700);
  font-weight: 600;
}

.query-groups {
  min-height: 200px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
  border: 2px dashed var(--gray-300);
}

.options-section {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.sort-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sort-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--gray-200);
}

.pagination-settings {
  padding: 0.75rem;
  background: var(--gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--gray-200);
}

.query-preview {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.query-json {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  padding: 1rem;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
}

.query-json pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.query-errors {
  background: white;
  border: 1px solid var(--red-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.results-section {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.result-stats {
  display: flex;
  gap: 0.5rem;
}

:deep(.arco-form-item) {
  margin-bottom: 0;
}

:deep(.arco-select-option-suffix) {
  margin-left: 0.5rem;
}
</style>