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
          <a-table-column title="操作" align="center" :width="200">
            <template #cell="{ record }">
              <a-space>
                <a-button size="small" @click="viewMapping(record)">
                  映射
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
      width="600px"
    >
      <a-form ref="createFormRef" :model="createForm" layout="vertical">
        <a-form-item field="name" label="索引名称" required>
          <a-input v-model="createForm.name" placeholder="请输入索引名称" />
        </a-form-item>
        
        <a-form-item field="mapping" label="索引映射（JSON格式，可选）">
          <a-textarea 
            v-model="createForm.mapping" 
            placeholder="请输入索引映射的JSON配置"
            :rows="10"
            :auto-size="{ minRows: 5, maxRows: 15 }"
          />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '../stores/connection'
import { useIndexStore } from '../stores/index'
import { useSearchStore } from '../stores/search'
import { IconRefresh, IconPlus } from '@arco-design/web-vue/es/icon'
import { Modal, Message } from '@arco-design/web-vue'
import type { IndexInfo } from '../types'

const router = useRouter()
const connectionStore = useConnectionStore()
const indexStore = useIndexStore()
const searchStore = useSearchStore()

const showCreateDialog = ref(false)
const showMappingDialog = ref(false)
const createLoading = ref(false)
const selectedIndexName = ref('')
const mappingData = ref<any>(null)

const createFormRef = ref()
const createForm = ref({
  name: '',
  mapping: ''
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
</style>