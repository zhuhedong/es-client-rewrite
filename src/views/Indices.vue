<template>
  <div class="indices-page">
    <div class="page-header">
      <h1>索引管理</h1>
      <a-space>
        <a-button @click="refreshData" :loading="indexStore.loading">
          <template #icon>
            <icon-refresh />
          </template>
          刷新
        </a-button>
        <a-button type="primary" @click="showCreateDialog = true">
          <template #icon>
            <icon-plus />
          </template>
          创建索引
        </a-button>
      </a-space>
    </div>

    <div v-if="!connectionStore.currentConnection" class="no-connection">
      <a-empty description="请先选择一个连接" />
    </div>

    <div v-else>
      <a-table 
        :data="indexStore.indices" 
        :loading="indexStore.loading"
        :pagination="{ pageSize: 20 }"
        row-key="name"
      >
        <template #columns>
          <a-table-column title="索引名称" data-index="name" :width="200">
            <template #cell="{ record }">
              <a-link @click="viewIndex(record)">{{ record.name }}</a-link>
            </template>
          </a-table-column>
          <a-table-column title="健康状态" data-index="health" align="center" :width="120">
            <template #cell="{ record }">
              <a-tag :color="getHealthColor(record.health)">
                {{ record.health?.toUpperCase() || 'N/A' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="状态" data-index="status" align="center" :width="100">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'open' ? 'green' : 'red'">
                {{ record.status?.toUpperCase() || 'N/A' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="主分片" data-index="primary_shards" align="center" :width="100" />
          <a-table-column title="副本分片" data-index="replica_shards" align="center" :width="100" />
          <a-table-column title="文档数" align="center" :width="120">
            <template #cell="{ record }">
              {{ formatNumber(record.docs_count) }}
            </template>
          </a-table-column>
          <a-table-column title="存储大小" align="center" :width="120">
            <template #cell="{ record }">
              {{ record.store_size || 'N/A' }}
            </template>
          </a-table-column>
          <a-table-column title="操作" align="center" :width="280">
            <template #cell="{ record }">
              <a-space>
                <a-button size="small" @click="viewMapping(record)">
                  映射
                </a-button>
                <a-button size="small" @click="viewSettings(record)">
                  设置
                </a-button>
                <a-button size="small" @click="viewAliases(record)">
                  别名
                </a-button>
                <a-button 
                  size="small" 
                  type="primary"
                  @click="searchIndex(record)"
                >
                  查询
                </a-button>
                <a-button 
                  size="small" 
                  status="danger"
                  @click="deleteIndex(record)"
                >
                  删除
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>

    <!-- 创建索引对话框 -->
    <a-modal
      v-model:visible="showCreateDialog"
      title="创建索引"
      @ok="handleCreateIndex"
      :confirm-loading="createLoading"
      width="900px"
    >
      <a-form ref="createFormRef" :model="createForm" layout="vertical">
        <a-form-item field="name" label="索引名称" required>
          <a-input v-model="createForm.name" placeholder="请输入索引名称" />
        </a-form-item>
        
        <a-form-item field="mapping" label="索引映射">
          <a-tabs v-model:active-key="mappingTab" type="rounded">
            <a-tab-pane key="visual" title="可视化编辑器">
              <mapping-editor 
                v-model="visualMapping"
                @change="onMappingChange"
              />
            </a-tab-pane>
            <a-tab-pane key="json" title="JSON编辑">
              <a-textarea 
                v-model="createForm.mapping" 
                placeholder="请输入索引映射的JSON配置"
                :rows="15"
                :auto-size="{ minRows: 10, maxRows: 20 }"
                class="json-editor"
              />
            </a-tab-pane>
          </a-tabs>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 查看映射对话框 -->
    <a-modal
      v-model:visible="showMappingDialog"
      :title="`索引映射 - ${selectedIndexName}`"
      :footer="false"
      width="800px"
    >
      <pre class="mapping-content">{{ formattedMapping }}</pre>
    </a-modal>

    <!-- 索引设置对话框 -->
    <a-modal
      v-model:visible="showSettingsDialog"
      :title="`索引设置 - ${selectedIndexName}`"
      @ok="updateSettings"
      :confirm-loading="settingsStore.loading"
      width="800px"
    >
      <div v-if="indexSettings">
        <a-form :model="settingsForm" layout="vertical">
          <a-form-item label="副本分片数">
            <a-input-number 
              v-model="settingsForm.number_of_replicas" 
              :min="0" 
              placeholder="副本分片数"
            />
          </a-form-item>
          
          <a-form-item label="刷新间隔">
            <a-input 
              v-model="settingsForm.refresh_interval" 
              placeholder="如：1s, 5s, 30s, -1（禁用）"
            />
          </a-form-item>
          
          <a-form-item label="最大结果窗口">
            <a-input-number 
              v-model="settingsForm.max_result_window" 
              :min="1" 
              placeholder="最大结果窗口大小"
            />
          </a-form-item>
          
          <a-form-item label="其他设置（JSON格式）">
            <a-textarea 
              v-model="otherSettingsText"
              :rows="8"
              placeholder="请输入其他索引设置的JSON配置"
              class="json-textarea"
            />
          </a-form-item>
        </a-form>
        
        <a-divider>当前设置详情</a-divider>
        <pre class="settings-content">{{ JSON.stringify(indexSettings, null, 2) }}</pre>
      </div>
    </a-modal>

    <!-- 别名管理对话框 -->
    <a-modal
      v-model:visible="showAliasDialog"
      :title="`别名管理 - ${selectedIndexName}`"
      :footer="false"
      width="900px"
    >
      <div class="alias-management">
        <div class="alias-actions">
          <a-space>
            <a-button type="primary" @click="showAddAliasForm = !showAddAliasForm">
              <template #icon>
                <icon-plus />
              </template>
              添加别名
            </a-button>
            <a-button @click="refreshAliases">
              <template #icon>
                <icon-refresh />
              </template>
              刷新
            </a-button>
          </a-space>
        </div>
        
        <!-- 添加别名表单 -->
        <div v-if="showAddAliasForm" class="add-alias-form">
          <a-card title="添加别名" size="small">
            <a-form :model="aliasForm" layout="inline">
              <a-form-item label="别名名称" required>
                <a-input v-model="aliasForm.alias" placeholder="请输入别名" />
              </a-form-item>
              
              <a-form-item label="路由（可选）">
                <a-input v-model="aliasForm.routing" placeholder="路由值" />
              </a-form-item>
              
              <a-form-item>
                <a-space>
                  <a-button type="primary" @click="handleAddAlias" :loading="settingsStore.loading">
                    添加
                  </a-button>
                  <a-button @click="showAddAliasForm = false">
                    取消
                  </a-button>
                </a-space>
              </a-form-item>
            </a-form>
            
            <a-form-item label="过滤器（JSON格式，可选）">
              <a-textarea 
                v-model="aliasForm.filter"
                :rows="4"
                placeholder="请输入过滤器的JSON配置"
                class="json-textarea"
              />
            </a-form-item>
          </a-card>
        </div>
        
        <!-- 别名列表 -->
        <div class="alias-list">
          <h3>当前别名</h3>
          <div v-if="indexAliases && Object.keys(indexAliases).length > 0">
            <div v-for="(aliases, indexName) in indexAliases" :key="indexName">
              <div v-if="aliases.aliases && Object.keys(aliases.aliases).length > 0">
                <a-table 
                  :data="Object.entries(aliases.aliases || {}).map(([alias, config]: [string, any]) => ({ alias, ...(config || {}) }))"
                  :pagination="false"
                  size="small"
                >
                  <template #columns>
                    <a-table-column title="别名" data-index="alias" :width="200" />
                    <a-table-column title="过滤器" :width="300">
                      <template #cell="{ record }">
                        <pre v-if="record.filter" class="filter-content">{{ JSON.stringify(record.filter, null, 2) }}</pre>
                        <span v-else>-</span>
                      </template>
                    </a-table-column>
                    <a-table-column title="路由" data-index="routing" :width="100">
                      <template #cell="{ record }">
                        {{ record.routing || '-' }}
                      </template>
                    </a-table-column>
                    <a-table-column title="操作" :width="120">
                      <template #cell="{ record }">
                        <a-button 
                          size="small" 
                          status="danger"
                          @click="handleRemoveAlias(record.alias)"
                        >
                          删除
                        </a-button>
                      </template>
                    </a-table-column>
                  </template>
                </a-table>
              </div>
            </div>
          </div>
          <a-empty v-else description="暂无别名" />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '../stores/connection'
import { useIndexStore } from '../stores/index'
import { useSearchStore } from '../stores/search'
import { useIndexSettingsStore } from '../stores/indexSettings'
import { IconRefresh, IconPlus } from '@arco-design/web-vue/es/icon'
import { Modal, Message } from '@arco-design/web-vue'
import type { IndexInfo } from '../types'
import MappingEditor from '../components/MappingEditor.vue'

const router = useRouter()
const connectionStore = useConnectionStore()
const indexStore = useIndexStore()
const searchStore = useSearchStore()
const settingsStore = useIndexSettingsStore()

const showCreateDialog = ref(false)
const showMappingDialog = ref(false)
const showSettingsDialog = ref(false)
const showAliasDialog = ref(false)
const showAddAliasForm = ref(false)
const createLoading = ref(false)
const mappingTab = ref('visual')
const visualMapping = ref({})
const selectedIndexName = ref('')
const mappingData = ref<any>(null)
const indexSettings = ref<any>(null)
const indexAliases = ref<any>(null)

const createFormRef = ref()
const createForm = ref({
  name: '',
  mapping: ''
})

// 设置表单
const settingsForm = ref({
  number_of_replicas: undefined as number | undefined,
  refresh_interval: '',
  max_result_window: undefined as number | undefined
})

const otherSettingsText = ref('')

// 别名表单
const aliasForm = ref({
  alias: '',
  filter: '',
  routing: ''
})

const formattedMapping = computed(() => {
  if (!mappingData.value) return ''
  return JSON.stringify(mappingData.value, null, 2)
})

onMounted(() => {
  if (connectionStore.currentConnection) {
    refreshData()
  }
})

watch(
  () => connectionStore.currentConnection,
  (newConnection) => {
    if (newConnection) {
      refreshData()
    }
  }
)

const refreshData = async () => {
  if (!connectionStore.currentConnection) return
  
  await indexStore.fetchIndices(connectionStore.currentConnection.id)
}

const getHealthColor = (health: string) => {
  switch (health?.toLowerCase()) {
    case 'green':
      return 'green'
    case 'yellow':
      return 'orange'
    case 'red':
      return 'red'
    default:
      return 'gray'
  }
}

const formatNumber = (num?: number) => {
  if (num === undefined || num === null) return 'N/A'
  return num.toLocaleString()
}

// 映射编辑器变化处理
const onMappingChange = (mapping: Record<string, any>) => {
  // 同步更新JSON编辑器的内容
  createForm.value.mapping = JSON.stringify(mapping, null, 2)
}

const handleCreateIndex = async () => {
  if (!connectionStore.currentConnection) return

  try {
    createLoading.value = true
    
    let mapping = undefined
    if (createForm.value.mapping.trim()) {
      try {
        mapping = JSON.parse(createForm.value.mapping)
      } catch (error) {
        Message.error('映射配置JSON格式错误')
        return
      }
    }
    
    await indexStore.createIndex(
      connectionStore.currentConnection.id,
      createForm.value.name,
      mapping
    )
    
    showCreateDialog.value = false
    createForm.value = {
      name: '',
      mapping: ''
    }
  } catch (error) {
    console.error('Failed to create index:', error)
  } finally {
    createLoading.value = false
  }
}

const viewIndex = (index: IndexInfo) => {
  // 可以实现查看索引详情的逻辑
  console.log('View index:', index)
}

const viewMapping = async (index: IndexInfo) => {
  if (!connectionStore.currentConnection) return

  try {
    selectedIndexName.value = index.name
    mappingData.value = await indexStore.getIndexMapping(
      connectionStore.currentConnection.id,
      index.name
    )
    showMappingDialog.value = true
  } catch (error) {
    console.error('Failed to get mapping:', error)
  }
}

const searchIndex = (index: IndexInfo) => {
  searchStore.updateQuery({ index: index.name })
  router.push('/search')
}

const deleteIndex = (index: IndexInfo) => {
  Modal.warning({
    title: '删除索引',
    content: `确定要删除索引 "${index.name}" 吗？此操作不可恢复！`,
    onOk: async () => {
      if (!connectionStore.currentConnection) return
      await indexStore.deleteIndex(connectionStore.currentConnection.id, index.name)
    }
  })
}

// 查看索引设置
const viewSettings = async (index: IndexInfo) => {
  if (!connectionStore.currentConnection) return

  try {
    selectedIndexName.value = index.name
    const settings = await settingsStore.getIndexSettings(
      connectionStore.currentConnection.id,
      index.name
    )
    indexSettings.value = settings
    
    // 填充表单
    const indexSettingsData = settings?.[index.name]?.settings?.index || {}
    settingsForm.value.number_of_replicas = parseInt(indexSettingsData.number_of_replicas) || undefined
    settingsForm.value.refresh_interval = indexSettingsData.refresh_interval || ''
    settingsForm.value.max_result_window = parseInt(indexSettingsData.max_result_window) || undefined
    
    // 其他设置
    const otherSettings = { ...indexSettingsData }
    delete otherSettings.number_of_replicas
    delete otherSettings.refresh_interval
    delete otherSettings.max_result_window
    delete otherSettings.number_of_shards // 主分片数不能修改
    
    otherSettingsText.value = Object.keys(otherSettings).length > 0 
      ? JSON.stringify(otherSettings, null, 2) 
      : ''
    
    showSettingsDialog.value = true
  } catch (error) {
    console.error('Failed to get settings:', error)
  }
}

// 更新索引设置
const updateSettings = async () => {
  if (!connectionStore.currentConnection) return

  try {
    const settings: any = {}
    
    if (settingsForm.value.number_of_replicas !== undefined) {
      settings.number_of_replicas = settingsForm.value.number_of_replicas
    }
    
    if (settingsForm.value.refresh_interval) {
      settings.refresh_interval = settingsForm.value.refresh_interval
    }
    
    if (settingsForm.value.max_result_window !== undefined) {
      settings.max_result_window = settingsForm.value.max_result_window
    }
    
    // 解析其他设置
    if (otherSettingsText.value.trim()) {
      try {
        const otherSettings = JSON.parse(otherSettingsText.value)
        settings.other_settings = otherSettings
      } catch (error) {
        Message.error('其他设置JSON格式错误')
        return
      }
    }
    
    const success = await settingsStore.updateIndexSettings(
      connectionStore.currentConnection.id,
      selectedIndexName.value,
      settings
    )
    
    if (success) {
      showSettingsDialog.value = false
    }
  } catch (error) {
    console.error('Failed to update settings:', error)
  }
}

// 查看别名
const viewAliases = async (index: IndexInfo) => {
  if (!connectionStore.currentConnection) return

  try {
    selectedIndexName.value = index.name
    const aliases = await settingsStore.getIndexAliases(
      connectionStore.currentConnection.id,
      index.name
    )
    indexAliases.value = aliases
    showAliasDialog.value = true
    showAddAliasForm.value = false
  } catch (error) {
    console.error('Failed to get aliases:', error)
  }
}

// 刷新别名
const refreshAliases = async () => {
  if (!connectionStore.currentConnection) return
  
  try {
    const aliases = await settingsStore.getIndexAliases(
      connectionStore.currentConnection.id,
      selectedIndexName.value
    )
    indexAliases.value = aliases
  } catch (error) {
    console.error('Failed to refresh aliases:', error)
  }
}

// 添加别名
const handleAddAlias = async () => {
  if (!connectionStore.currentConnection) return
  
  if (!aliasForm.value.alias) {
    Message.error('请输入别名名称')
    return
  }
  
  try {
    let filter = undefined
    if (aliasForm.value.filter.trim()) {
      try {
        filter = JSON.parse(aliasForm.value.filter)
      } catch (error) {
        Message.error('过滤器JSON格式错误')
        return
      }
    }
    
    const success = await settingsStore.addAlias(
      connectionStore.currentConnection.id,
      selectedIndexName.value,
      aliasForm.value.alias,
      filter,
      aliasForm.value.routing || undefined
    )
    
    if (success) {
      aliasForm.value = { alias: '', filter: '', routing: '' }
      showAddAliasForm.value = false
      await refreshAliases()
    }
  } catch (error) {
    console.error('Failed to add alias:', error)
  }
}

// 删除别名
const handleRemoveAlias = async (alias: string) => {
  if (!connectionStore.currentConnection) return
  
  Modal.warning({
    title: '删除别名',
    content: `确定要删除别名 "${alias}" 吗？`,
    onOk: async () => {
      if (!connectionStore.currentConnection) return
      const success = await settingsStore.removeAlias(
        connectionStore.currentConnection.id,
        selectedIndexName.value,
        alias
      )
      
      if (success) {
        await refreshAliases()
      }
    }
  })
}
</script>

<style scoped>
.indices-page {
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
  background: linear-gradient(135deg, var(--primary-color), var(--info-color));
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

.mapping-content {
  background: linear-gradient(135deg, var(--gray-900), var(--gray-800));
  color: #e2e8f0;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  max-height: 500px;
  overflow: auto;
  font-size: 0.875rem;
  line-height: 1.6;
  border: 1px solid var(--gray-700);
  box-shadow: var(--shadow-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.settings-content {
  background: linear-gradient(135deg, var(--gray-900), var(--gray-800));
  color: #e2e8f0;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  max-height: 400px;
  overflow: auto;
  font-size: 0.875rem;
  line-height: 1.6;
  border: 1px solid var(--gray-700);
  box-shadow: var(--shadow-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.json-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
}

.alias-management {
  min-height: 400px;
}

.alias-actions {
  margin-bottom: 16px;
}

.add-alias-form {
  margin-bottom: 24px;
}

.alias-list h3 {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-800);
}

.filter-content {
  background: var(--gray-100);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  max-height: 100px;
  overflow: auto;
  margin: 0;
}

/* 现代化表格样式 */
:deep(.arco-table) {
  background: white;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--gray-200);
}

:deep(.arco-table-th) {
  background: linear-gradient(135deg, var(--gray-50), var(--gray-100)) !important;
  color: var(--gray-700) !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em !important;
}

:deep(.arco-table-td) {
  padding: 1rem !important;
  border-color: var(--gray-200) !important;
}

:deep(.arco-table-tbody .arco-table-tr:hover) {
  background: var(--gray-50) !important;
  transform: scale(1.01);
  transition: all 0.2s ease;
}

/* 现代化按钮组 */
:deep(.arco-space-item .arco-btn) {
  border-radius: var(--radius-lg) !important;
  font-weight: 500 !important;
  padding: 0.5rem 1rem !important;
  transition: all 0.2s ease !important;
}

:deep(.arco-btn-size-small) {
  font-size: 0.875rem !important;
}

:deep(.arco-btn-status-danger) {
  background: var(--error-color) !important;
  border-color: var(--error-color) !important;
  color: white !important;
}

:deep(.arco-btn-status-danger:hover) {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
  transform: translateY(-1px);
}

/* 现代化标签 */
:deep(.arco-tag) {
  padding: 0.375rem 0.75rem !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.025em !important;
}

/* 现代化链接 */
:deep(.arco-link) {
  font-weight: 600 !important;
  color: var(--primary-color) !important;
  transition: all 0.2s ease !important;
}

:deep(.arco-link:hover) {
  color: var(--primary-hover) !important;
  text-decoration: underline !important;
}

/* 现代化模态框 */
:deep(.arco-modal) {
  border-radius: var(--radius-xl) !important;
}

:deep(.arco-modal-header) {
  background: linear-gradient(135deg, var(--gray-50), white) !important;
  border-bottom: 1px solid var(--gray-200) !important;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0 !important;
}

:deep(.arco-modal-title) {
  font-weight: 600 !important;
  color: var(--gray-800) !important;
}

:deep(.arco-form-item-label-text) {
  font-weight: 600 !important;
  color: var(--gray-700) !important;
}

:deep(.arco-textarea) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  font-size: 0.875rem !important;
  line-height: 1.6 !important;
}

/* 分页样式 */
:deep(.arco-pagination) {
  gap: 0.5rem !important;
  margin-top: 1.5rem !important;
  justify-content: center !important;
  padding: 1rem !important;
  background: var(--gray-50) !important;
  border-radius: var(--radius-lg) !important;
  border: 1px solid var(--gray-200) !important;
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

.json-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}
</style>