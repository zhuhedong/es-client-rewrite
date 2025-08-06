<template>
  <div class="connections-page">
    <div class="page-header">
      <h1>连接管理</h1>
      <a-button type="primary" @click="showAddDialog = true">
        <template #icon>
          <icon-plus />
        </template>
        添加连接
      </a-button>
    </div>

    <a-table 
      :data="connectionStore.connections" 
      :loading="connectionStore.loading"
      :pagination="false"
    >
      <template #columns>
        <a-table-column title="名称" data-index="name" />
        <a-table-column title="URL" data-index="url" />
        <a-table-column title="用户名" data-index="username" />
        <a-table-column title="状态" align="center">
          <template #cell="{ record }">
            <a-tag 
              :color="currentConnection?.id === record.id ? 'green' : 'gray'"
            >
              {{ currentConnection?.id === record.id ? '当前连接' : '未连接' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" align="center" :width="200">
          <template #cell="{ record }">
            <a-space>
              <a-button size="small" @click="testConnection(record.id)">
                测试
              </a-button>
              <a-button 
                size="small" 
                type="primary"
                :disabled="currentConnection?.id === record.id"
                @click="selectConnection(record)"
              >
                连接
              </a-button>
              <a-button 
                size="small" 
                status="danger"
                @click="deleteConnection(record)"
              >
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <!-- 添加连接对话框 -->
    <a-modal
      v-model:visible="showAddDialog"
      title="添加连接"
      @ok="handleAddConnection"
      :confirm-loading="loading"
    >
      <a-form ref="formRef" :model="form" layout="vertical">
        <a-form-item field="name" label="连接名称" required>
          <a-input v-model="form.name" placeholder="请输入连接名称" />
        </a-form-item>
        
        <a-form-item field="url" label="Elasticsearch URL" required>
          <a-input v-model="form.url" placeholder="http://localhost:9200" />
        </a-form-item>
        
        <a-form-item field="username" label="用户名">
          <a-input v-model="form.username" placeholder="用户名（可选）" />
        </a-form-item>
        
        <a-form-item field="password" label="密码">
          <a-input-password v-model="form.password" placeholder="密码（可选）" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '../stores/connection'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import { Modal, Message } from '@arco-design/web-vue'
import type { EsConnection } from '../types'

const router = useRouter()
const connectionStore = useConnectionStore()

const showAddDialog = ref(false)
const loading = ref(false)
const formRef = ref()

const form = ref({
  name: '',
  url: '',
  username: '',
  password: ''
})

const currentConnection = computed(() => connectionStore.currentConnection)

onMounted(() => {
  connectionStore.loadConnections()
})

const handleAddConnection = async () => {
  try {
    loading.value = true
    
    const connection: EsConnection = {
      id: '',
      name: form.value.name,
      url: form.value.url,
      username: form.value.username || undefined,
      password: form.value.password || undefined,
      headers: {}
    }
    
    await connectionStore.addConnection(connection)
    
    showAddDialog.value = false
    form.value = {
      name: '',
      url: '',
      username: '',
      password: ''
    }
  } catch (error) {
    console.error('Failed to add connection:', error)
  } finally {
    loading.value = false
  }
}

const testConnection = async (id: string) => {
  try {
    await connectionStore.testConnection(id)
  } catch (error) {
    console.error('Connection test failed:', error)
  }
}

const selectConnection = (connection: EsConnection) => {
  connectionStore.setCurrentConnection(connection.id)
  Message.success(`已连接到 ${connection.name}`)
  router.push('/dashboard')
}

const deleteConnection = (connection: EsConnection) => {
  Modal.warning({
    title: '删除连接',
    content: `确定要删除连接 "${connection.name}" 吗？`,
    onOk: async () => {
      await connectionStore.removeConnection(connection.id)
    }
  })
}
</script>

<style scoped>
.connections-page {
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
</style>