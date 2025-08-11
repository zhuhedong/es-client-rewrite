<template>
  <div class="document-page">
    <div class="page-header">
      <h1>文档管理</h1>
      <a-space>
        <a-button @click="showCreateDialog = true" type="primary">
          <template #icon>
            <icon-plus />
          </template>
          新建文档
        </a-button>
        <a-button @click="showGetDialog = true">
          <template #icon>
            <icon-search />
          </template>
          获取文档
        </a-button>
        <a-button @click="showBulkDialog = true">
          <template #icon>
            <icon-layers />
          </template>
          批量操作
        </a-button>
      </a-space>
    </div>

    <div v-if="!connectionStore.currentConnection" class="no-connection">
      <a-empty description="请先选择一个连接" />
    </div>

    <div v-else class="document-content">
      <!-- 当前文档显示 -->
      <div v-if="documentStore.currentDocument" class="current-document">
        <a-card>
          <template #title>
            <a-space>
              <span>文档详情</span>
              <a-tag v-if="documentStore.currentDocument.found" color="green">存在</a-tag>
              <a-tag v-else color="red">不存在</a-tag>
            </a-space>
          </template>
          <template #extra>
            <a-space>
              <a-button 
                v-if="documentStore.currentDocument.found"
                @click="editDocument"
                size="small"
              >
                <template #icon>
                  <icon-edit />
                </template>
                编辑
              </a-button>
              <a-button 
                v-if="documentStore.currentDocument.found"
                @click="deleteCurrentDocument"
                status="danger"
                size="small"
              >
                <template #icon>
                  <icon-delete />
                </template>
                删除
              </a-button>
              <a-button @click="documentStore.clearCurrentDocument" size="small">
                <template #icon>
                  <icon-close />
                </template>
                关闭
              </a-button>
            </a-space>
          </template>

          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="索引">{{ documentStore.currentDocument.index }}</a-descriptions-item>
            <a-descriptions-item label="文档ID">{{ documentStore.currentDocument.id }}</a-descriptions-item>
            <a-descriptions-item label="版本" v-if="documentStore.currentDocument.version">
              {{ documentStore.currentDocument.version }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              {{ documentStore.currentDocument.found ? '存在' : '不存在' }}
            </a-descriptions-item>
          </a-descriptions>

          <div v-if="documentStore.currentDocument.found && documentStore.currentDocument.source" 
               class="document-source">
            <h3>文档内容</h3>
            <a-textarea 
              v-model="currentSource"
              :rows="15"
              readonly
              class="json-textarea"
            />
          </div>
        </a-card>
      </div>
    </div>

    <!-- 新建文档对话框 -->
    <a-modal
      v-model:visible="showCreateDialog"
      title="新建文档"
      width="800px"
      @ok="handleCreateDocument"
      :confirm-loading="documentStore.loading"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="索引名称" required>
          <a-select 
            v-model="createForm.index" 
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

        <a-form-item label="文档ID" help="留空将自动生成">
          <a-input v-model="createForm.id" placeholder="文档ID（可选）" />
        </a-form-item>

        <a-form-item label="文档内容" required>
          <a-textarea 
            v-model="createForm.document"
            :rows="12"
            placeholder="请输入JSON格式的文档内容"
            class="json-textarea"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 获取文档对话框 -->
    <a-modal
      v-model:visible="showGetDialog"
      title="获取文档"
      @ok="handleGetDocument"
      :confirm-loading="documentStore.loading"
    >
      <a-form :model="getForm" layout="vertical">
        <a-form-item label="索引名称" required>
          <a-select 
            v-model="getForm.index" 
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

        <a-form-item label="文档ID" required>
          <a-input v-model="getForm.id" placeholder="请输入文档ID" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量操作对话框 -->
    <a-modal
      v-model:visible="showBulkDialog"
      title="批量操作"
      width="900px"
      @ok="handleBulkOperations"
      :confirm-loading="documentStore.loading"
    >
      <a-form layout="vertical">
        <a-form-item label="操作配置" help="支持的操作类型：index(索引), create(创建), update(更新), delete(删除)">
          <a-textarea 
            v-model="bulkOperationsText"
            :rows="15"
            placeholder="请输入批量操作配置，每行一个操作，格式：操作类型|索引名称|文档ID|文档内容(JSON)&#10;&#10;示例：&#10;index|my-index|doc1|{&quot;name&quot;: &quot;张三&quot;, &quot;age&quot;: 25}&#10;create|my-index|doc2|{&quot;name&quot;: &quot;李四&quot;, &quot;age&quot;: 30}&#10;update|my-index|doc1|{&quot;age&quot;: 26}&#10;delete|my-index|doc3|"
            class="json-textarea"
          />
        </a-form-item>

        <a-form-item>
          <a-alert 
            type="info" 
            title="批量操作说明"
          >
            <template #description>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>index</strong>: 索引文档（如果存在则覆盖）</li>
                <li><strong>create</strong>: 创建文档（如果已存在则失败）</li>
                <li><strong>update</strong>: 更新文档（必须已存在）</li>
                <li><strong>delete</strong>: 删除文档（不需要文档内容）</li>
              </ul>
            </template>
          </a-alert>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑文档对话框 -->
    <a-modal
      v-model:visible="showEditDialog"
      title="编辑文档"
      width="800px"
      @ok="handleUpdateDocument"
      :confirm-loading="documentStore.loading"
    >
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="索引名称">
          <a-input v-model="editForm.index" readonly />
        </a-form-item>

        <a-form-item label="文档ID">
          <a-input v-model="editForm.id" readonly />
        </a-form-item>

        <a-form-item label="文档内容" required>
          <a-textarea 
            v-model="editForm.document"
            :rows="12"
            placeholder="请输入JSON格式的文档内容"
            class="json-textarea"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConnectionStore } from '../stores/connection'
import { useIndexStore } from '../stores/index'
import { useDocumentStore } from '../stores/document'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconDelete,
  IconClose,
  IconLayers
} from '@arco-design/web-vue/es/icon'

const connectionStore = useConnectionStore()
const indexStore = useIndexStore()
const documentStore = useDocumentStore()

// 对话框状态
const showCreateDialog = ref(false)
const showGetDialog = ref(false)
const showEditDialog = ref(false)
const showBulkDialog = ref(false)

// 表单数据
const createForm = ref({
  index: '',
  id: '',
  document: ''
})

const getForm = ref({
  index: '',
  id: ''
})

const editForm = ref({
  index: '',
  id: '',
  document: ''
})

// 批量操作文本
const bulkOperationsText = ref('')

// 当前文档源码
const currentSource = computed(() => {
  if (documentStore.currentDocument?.source) {
    return JSON.stringify(documentStore.currentDocument.source, null, 2)
  }
  return ''
})

// 加载索引列表
const loadIndices = async () => {
  if (!connectionStore.currentConnection) return
  await indexStore.loadIndices(connectionStore.currentConnection.id)
}

// 创建文档
const handleCreateDocument = async () => {
  if (!connectionStore.currentConnection) {
    Message.error('请先选择连接')
    return
  }

  if (!createForm.value.index || !createForm.value.document) {
    Message.error('请填写必填字段')
    return
  }

  try {
    const documentData = JSON.parse(createForm.value.document)
    const response = await documentStore.createDocument(
      connectionStore.currentConnection.id,
      {
        index: createForm.value.index,
        id: createForm.value.id || undefined,
        document: documentData
      }
    )

    if (response) {
      showCreateDialog.value = false
      createForm.value = { index: '', id: '', document: '' }
      
      // 自动获取刚创建的文档
      await documentStore.getDocument(
        connectionStore.currentConnection.id,
        response.index,
        response.id
      )
    }
  } catch (error) {
    Message.error('JSON格式错误，请检查文档内容')
  }
}

// 获取文档
const handleGetDocument = async () => {
  if (!connectionStore.currentConnection) {
    Message.error('请先选择连接')
    return
  }

  if (!getForm.value.index || !getForm.value.id) {
    Message.error('请填写必填字段')
    return
  }

  await documentStore.getDocument(
    connectionStore.currentConnection.id,
    getForm.value.index,
    getForm.value.id
  )

  showGetDialog.value = false
  getForm.value = { index: '', id: '' }
}

// 编辑文档
const editDocument = () => {
  if (!documentStore.currentDocument) return

  editForm.value = {
    index: documentStore.currentDocument.index,
    id: documentStore.currentDocument.id,
    document: JSON.stringify(documentStore.currentDocument.source, null, 2)
  }
  showEditDialog.value = true
}

// 更新文档
const handleUpdateDocument = async () => {
  if (!connectionStore.currentConnection) {
    Message.error('请先选择连接')
    return
  }

  try {
    const documentData = JSON.parse(editForm.value.document)
    const response = await documentStore.updateDocument(
      connectionStore.currentConnection.id,
      {
        index: editForm.value.index,
        id: editForm.value.id,
        document: documentData
      }
    )

    if (response) {
      showEditDialog.value = false
      
      // 重新获取更新后的文档
      await documentStore.getDocument(
        connectionStore.currentConnection.id,
        response.index,
        response.id
      )
    }
  } catch (error) {
    Message.error('JSON格式错误，请检查文档内容')
  }
}

// 删除文档
const deleteCurrentDocument = () => {
  if (!documentStore.currentDocument || !connectionStore.currentConnection) return

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除文档 ${documentStore.currentDocument.id} 吗？此操作不可撤销。`,
    onOk: async () => {
      const response = await documentStore.deleteDocument(
        connectionStore.currentConnection!.id,
        documentStore.currentDocument!.index,
        documentStore.currentDocument!.id
      )
      
      if (response) {
        documentStore.clearCurrentDocument()
      }
    }
  })
}

// 批量操作
const handleBulkOperations = async () => {
  if (!connectionStore.currentConnection) {
    Message.error('请先选择连接')
    return
  }

  if (!bulkOperationsText.value.trim()) {
    Message.error('请输入批量操作配置')
    return
  }

  try {
    const operations = []
    const lines = bulkOperationsText.value.trim().split('\n')
    
    for (const line of lines) {
      if (!line.trim()) continue
      
      const parts = line.split('|')
      if (parts.length < 3) {
        Message.error(`操作格式错误: ${line}`)
        return
      }
      
      const [action, index, id, documentStr] = parts
      const operation: any = {
        action: action.trim(),
        index: index.trim(),
        id: id.trim() || undefined
      }
      
      // 解析文档内容
      if (documentStr && documentStr.trim() && action.trim() !== 'delete') {
        try {
          operation.document = JSON.parse(documentStr.trim())
        } catch (error) {
          Message.error(`文档JSON格式错误: ${documentStr}`)
          return
        }
      }
      
      operations.push(operation)
    }
    
    const response = await documentStore.bulkOperations(
      connectionStore.currentConnection.id,
      { operations }
    )

    if (response) {
      showBulkDialog.value = false
      bulkOperationsText.value = ''
    }
  } catch (error) {
    Message.error(`批量操作配置解析失败: ${error}`)
  }
}

onMounted(() => {
  loadIndices()
})
</script>

<style scoped>
.document-page {
  padding: 24px;
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

.document-content {
  height: calc(100% - 80px);
}

.current-document {
  margin-bottom: 24px;
}

.document-source {
  margin-top: 16px;
}

.document-source h3 {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
}

.json-textarea {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>