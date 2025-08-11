<template>
  <div class="import-page">
    <div class="page-header">
      <h1>数据导入</h1>
      <a-space>
        <a-button @click="showImportDialog = true" type="primary">
          <template #icon>
            <icon-upload />
          </template>
          导入数据
        </a-button>
      </a-space>
    </div>

    <div v-if="!connectionStore.currentConnection" class="no-connection">
      <a-empty description="请先选择一个连接" />
    </div>

    <div v-else class="import-content">
      <!-- 导入历史 -->
      <a-card title="导入历史" class="import-history">
        <a-table 
          :data="importHistory" 
          :columns="historyColumns"
          :pagination="false"
        >
          <template #status="{ record }">
            <a-tag :color="record.success ? 'green' : 'red'">
              {{ record.success ? '成功' : '失败' }}
            </a-tag>
          </template>
          <template #actions="{ record }">
            <a-button 
              @click="showImportDetails(record)"
              size="small"
              type="text"
            >
              查看详情
            </a-button>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 导入对话框 -->
    <a-modal
      v-model:visible="showImportDialog"
      title="导入数据"
      width="600px"
      @ok="handleImport"
      :confirm-loading="importing"
    >
      <a-form ref="importFormRef" :model="importForm" layout="vertical">
        <a-form-item label="目标索引" required>
          <a-input 
            v-model="importForm.index" 
            placeholder="输入索引名称"
          />
        </a-form-item>

        <a-form-item label="数据文件" required>
          <a-upload
            :before-upload="handleFileSelect"
            :show-file-list="false"
            accept=".json,.csv"
          >
            <a-button>
              <template #icon>
                <icon-folder />
              </template>
              选择文件
            </a-button>
          </a-upload>
          <div v-if="selectedFile" class="selected-file">
            <a-tag>{{ selectedFile.name }}</a-tag>
          </div>
        </a-form-item>

        <a-form-item label="文件格式">
          <a-radio-group v-model="importForm.format">
            <a-radio value="JSON">JSON</a-radio>
            <a-radio value="CSV">CSV</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="ID字段" help="指定作为文档ID的字段名（可选）">
          <a-input 
            v-model="importForm.id_field" 
            placeholder="例如：id, _id"
          />
        </a-form-item>

        <a-form-item label="批次大小" help="每次批量导入的文档数量">
          <a-input-number 
            v-model="importForm.batch_size" 
            :min="1" 
            :max="10000"
            :default-value="1000"
          />
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model="importForm.create_index">
            自动创建索引（如果不存在）
          </a-checkbox>
        </a-form-item>

        <!-- 映射配置（仅在创建索引时显示） -->
        <a-form-item v-if="importForm.create_index" label="索引映射（可选）">
          <a-tabs v-model:active-key="importMappingTab" type="rounded">
            <a-tab-pane key="visual" title="可视化编辑器">
              <mapping-editor 
                v-model="importVisualMapping"
                @change="onImportMappingChange"
              />
            </a-tab-pane>
            <a-tab-pane key="json" title="JSON编辑">
              <a-textarea 
                v-model="importForm.mapping" 
                placeholder="请输入索引映射的JSON配置"
                :rows="10"
                class="json-editor"
              />
            </a-tab-pane>
          </a-tabs>
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model="importForm.overwrite_existing">
            覆盖已存在的文档
          </a-checkbox>
        </a-form-item>

        <a-form-item 
          v-if="importForm.create_index" 
          label="索引映射" 
          help="可选的索引映射配置（JSON格式）"
        >
          <a-textarea 
            v-model="mappingText"
            :rows="6"
            placeholder='{"mappings": {"properties": {"field1": {"type": "text"}}}}'
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 导入详情对话框 -->
    <a-modal
      v-model:visible="showDetailsDialog"
      title="导入详情"
      width="800px"
      :footer="false"
    >
      <div v-if="selectedImport" class="import-details">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="selectedImport.success ? 'green' : 'red'">
              {{ selectedImport.success ? '成功' : '失败' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="总处理数">
            {{ selectedImport.total_processed }}
          </a-descriptions-item>
          <a-descriptions-item label="成功导入">
            {{ selectedImport.successful_imports }}
          </a-descriptions-item>
          <a-descriptions-item label="失败数量">
            {{ selectedImport.failed_imports }}
          </a-descriptions-item>
          <a-descriptions-item label="消息" :span="2">
            {{ selectedImport.message }}
          </a-descriptions-item>
        </a-descriptions>

        <div v-if="selectedImport.errors.length > 0" class="import-errors">
          <h4>错误详情</h4>
          <a-table 
            :data="selectedImport.errors" 
            :columns="errorColumns"
            :pagination="{ pageSize: 10 }"
          >
          </a-table>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { 
  IconUpload, 
  IconFolder,
} from '@arco-design/web-vue/es/icon'
import { Api, type ImportRequest, type ImportResult } from '../api'
import { ImportFormat } from '../types'
import { useConnectionStore } from '../stores/connection'
import MappingEditor from '../components/MappingEditor.vue'

const connectionStore = useConnectionStore()

// 响应式数据
const showImportDialog = ref(false)
const showDetailsDialog = ref(false)
const importing = ref(false)
const selectedFile = ref<File | null>(null)
const mappingText = ref('')
const importHistory = ref<ImportResult[]>([])
const selectedImport = ref<ImportResult | null>(null)

// 表单数据
const importForm = reactive({
  index: '',
  format: ImportFormat.JSON,
  id_field: '',
  batch_size: 1000,
  create_index: true,
  overwrite_existing: false,
  mapping: ''
})

const importMappingTab = ref('visual')
const importVisualMapping = ref({})

// 映射编辑器变化处理
const onImportMappingChange = (mapping: Record<string, any>) => {
  importForm.mapping = JSON.stringify(mapping, null, 2)
}

// 表格列定义
const historyColumns = [
  { title: '索引', dataIndex: 'index', key: 'index' },
  { title: '总数', dataIndex: 'total_processed', key: 'total_processed' },
  { title: '成功', dataIndex: 'successful_imports', key: 'successful_imports' },
  { title: '失败', dataIndex: 'failed_imports', key: 'failed_imports' },
  { title: '状态', slotName: 'status' },
  { title: '操作', slotName: 'actions', width: 100 }
]

const errorColumns = [
  { title: '行号', dataIndex: 'line_number', key: 'line_number' },
  { title: '错误信息', dataIndex: 'error_message', key: 'error_message' }
]

// 文件选择处理
const handleFileSelect = (file: File) => {
  selectedFile.value = file
  
  // 根据文件扩展名自动设置格式
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'json') {
    importForm.format = ImportFormat.JSON
  } else if (extension === 'csv') {
    importForm.format = ImportFormat.CSV
  }
  
  return false // 阻止自动上传
}

// 导入处理
const handleImport = async () => {
  if (!selectedFile.value) {
    Message.error('请选择要导入的文件')
    return
  }

  if (!importForm.index.trim()) {
    Message.error('请输入目标索引名称')
    return
  }

  if (!connectionStore.currentConnection) {
    Message.error('请先选择一个连接')
    return
  }

  importing.value = true
  
  try {
    // 解析映射配置
    let mapping = null
    if (mappingText.value.trim()) {
      try {
        mapping = JSON.parse(mappingText.value)
      } catch (e) {
        Message.error('映射配置格式不正确，请检查JSON语法')
        return
      }
    }

    // 构建导入请求
    const request: ImportRequest = {
      connection_id: connectionStore.currentConnection.id,
      index: importForm.index.trim(),
      file_path: (selectedFile.value as any).path || selectedFile.value.name, // Tauri会处理文件路径
      format: importForm.format,
      id_field: importForm.id_field.trim() || undefined,
      batch_size: importForm.batch_size,
      mapping,
      create_index: importForm.create_index,
      overwrite_existing: importForm.overwrite_existing
    }

    const result = await Api.importData(request)
    
    // 添加到历史记录
    importHistory.value.unshift({
      ...result,
      index: request.index,
      timestamp: Date.now()
    } as any)

    if (result.success) {
      Message.success(result.message)
    } else {
      Message.warning(result.message)
    }

    // 关闭对话框并重置表单
    showImportDialog.value = false
    resetImportForm()
    
  } catch (error: any) {
    console.error('导入失败:', error)
    Message.error(error.message || '导入失败')
  } finally {
    importing.value = false
  }
}

// 重置导入表单
const resetImportForm = () => {
  importForm.index = ''
  importForm.format = ImportFormat.JSON
  importForm.id_field = ''
  importForm.batch_size = 1000
  importForm.create_index = true
  importForm.overwrite_existing = false
  selectedFile.value = null
  mappingText.value = ''
}

// 显示导入详情
const showImportDetails = (importResult: ImportResult) => {
  selectedImport.value = importResult
  showDetailsDialog.value = true
}

onMounted(() => {
  // 可以从本地存储加载历史记录
  const saved = localStorage.getItem('import-history')
  if (saved) {
    try {
      importHistory.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load import history:', e)
    }
  }
})

// 监听历史记录变化，保存到本地存储
import { watchEffect } from 'vue'
watchEffect(() => {
  if (importHistory.value.length > 0) {
    localStorage.setItem('import-history', JSON.stringify(importHistory.value.slice(0, 50))) // 只保存最近50条
  }
})
</script>

<style scoped>
.import-page {
  padding: 20px;
  height: 100vh;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
}

.no-connection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.import-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.import-history {
  flex: 1;
}

.selected-file {
  margin-top: 8px;
}

.import-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.import-errors {
  margin-top: 16px;
}

.import-errors h4 {
  margin: 0 0 12px 0;
  color: #f53f3f;
}

.json-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}
</style>