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

.mapping-content {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  max-height: 500px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
}
</style>