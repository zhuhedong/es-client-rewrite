<template>
  <div class="templates">
    <div class="header">
      <h2>模板管理</h2>
      <a-button type="primary" @click="showCreateDialog = true">
        <template #icon>
          <icon-plus />
        </template>
        创建模板
      </a-button>
    </div>

    <a-spin :loading="templateStore.loading" style="width: 100%">
      <a-table 
        :data="templateData"
        :columns="columns"
        :pagination="false"
        row-key="name"
        size="large"
        :scroll="{ y: '600px' }"
        class="templates-table"
      >
        <template #name="{ record }">
          <div class="template-name">
            <icon-calendar />
            <strong>{{ record.name }}</strong>
          </div>
        </template>

        <template #index_patterns="{ record }">
          <div class="patterns">
            <a-tag v-for="pattern in record.template.index_patterns" :key="pattern" color="blue">
              {{ pattern }}
            </a-tag>
          </div>
        </template>

        <template #version="{ record }">
          <a-tag v-if="record.template.version" color="green">
            v{{ record.template.version }}
          </a-tag>
          <span v-else class="text-gray">-</span>
        </template>

        <template #order="{ record }">
          <a-badge 
            v-if="record.template.order !== undefined" 
            :count="record.template.order" 
            :max-count="999"
          />
          <span v-else class="text-gray">-</span>
        </template>

        <template #actions="{ record }">
          <a-space>
            <a-button size="small" @click="viewTemplate(record)" type="text">
              <template #icon>
                <icon-eye />
              </template>
              查看
            </a-button>
            <a-button size="small" @click="editTemplate(record)" type="text">
              <template #icon>
                <icon-edit />
              </template>
              编辑
            </a-button>
            <a-popconfirm
              content="确定要删除此模板吗？"
              @ok="deleteTemplate(record.name)"
            >
              <a-button size="small" type="text" status="danger">
                <template #icon>
                  <icon-delete />
                </template>
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-spin>

    <!-- 创建/编辑模板对话框 -->
    <a-modal
      v-model:visible="showCreateDialog"
      :title="currentTemplate ? '编辑模板' : '创建模板'"
      width="800px"
      @ok="handleSaveTemplate"
      @cancel="handleCancelEdit"
      :ok-loading="templateStore.loading"
    >
      <a-form :model="templateForm" layout="vertical" ref="formRef">
        <a-form-item label="模板名称" field="name" :rules="[{ required: true, message: '请输入模板名称' }]">
          <a-input 
            v-model="templateForm.name" 
            placeholder="请输入模板名称"
            :disabled="!!currentTemplate"
          />
        </a-form-item>

        <a-form-item label="索引模式" field="index_patterns" :rules="[{ required: true, message: '请输入至少一个索引模式' }]">
          <a-input-tag 
            v-model="templateForm.index_patterns"
            placeholder="输入索引模式，支持通配符，如 logs-*"
            allow-clear
          />
          <div class="form-help">支持通配符，如 logs-*, my-index-*</div>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="版本号" field="version">
              <a-input-number 
                v-model="templateForm.version" 
                placeholder="版本号"
                :min="1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="优先级" field="order">
              <a-input-number 
                v-model="templateForm.order" 
                placeholder="优先级"
                :min="0"
                style="width: 100%"
              />
              <div class="form-help">数字越大优先级越高</div>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="设置 (Settings)">
          <a-textarea
            v-model="templateForm.settings"
            placeholder="请输入索引设置 (JSON格式)"
            :rows="8"
            class="json-input"
          />
        </a-form-item>

        <a-form-item label="映射 (Mappings)">
          <a-textarea
            v-model="templateForm.mappings"
            placeholder="请输入字段映射 (JSON格式)"
            :rows="8"
            class="json-input"
          />
        </a-form-item>

        <a-form-item label="别名 (Aliases)">
          <a-textarea
            v-model="templateForm.aliases"
            placeholder="请输入别名配置 (JSON格式)"
            :rows="6"
            class="json-input"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 查看模板对话框 -->
    <a-modal
      v-model:visible="showViewDialog"
      title="模板详情"
      width="800px"
      :footer="false"
    >
      <div v-if="viewTemplateData" class="template-detail">
        <a-descriptions :data="templateDescriptions" :column="2" bordered />
        
        <div class="json-sections">
          <div v-if="viewTemplateData.template.settings" class="json-section">
            <h4>设置 (Settings)</h4>
            <pre class="json-content">{{ JSON.stringify(viewTemplateData.template.settings, null, 2) }}</pre>
          </div>

          <div v-if="viewTemplateData.template.mappings" class="json-section">
            <h4>映射 (Mappings)</h4>
            <pre class="json-content">{{ JSON.stringify(viewTemplateData.template.mappings, null, 2) }}</pre>
          </div>

          <div v-if="viewTemplateData.template.aliases" class="json-section">
            <h4>别名 (Aliases)</h4>
            <pre class="json-content">{{ JSON.stringify(viewTemplateData.template.aliases, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useTemplateStore } from '../stores/template'
import type { IndexTemplate, TemplateRequest } from '../types'
import { Message } from '@arco-design/web-vue'
import {
  IconPlus,
  IconCalendar,
  IconEye,
  IconEdit,
  IconDelete
} from '@arco-design/web-vue/es/icon'

const templateStore = useTemplateStore()

const showCreateDialog = ref(false)
const showViewDialog = ref(false)
const currentTemplate = ref<{ name: string; template: IndexTemplate } | null>(null)
const viewTemplateData = ref<{ name: string; template: IndexTemplate } | null>(null)
const formRef = ref()

const templateForm = reactive({
  name: '',
  index_patterns: [] as string[],
  version: undefined as number | undefined,
  order: undefined as number | undefined,
  settings: '',
  mappings: '',
  aliases: ''
})

const columns = [
  {
    title: '模板名称',
    dataIndex: 'name',
    slotName: 'name',
    width: 200
  },
  {
    title: '索引模式',
    dataIndex: 'index_patterns',
    slotName: 'index_patterns'
  },
  {
    title: '版本',
    dataIndex: 'version',
    slotName: 'version',
    width: 100
  },
  {
    title: '优先级',
    dataIndex: 'order',
    slotName: 'order',
    width: 100
  },
  {
    title: '操作',
    slotName: 'actions',
    width: 200,
    fixed: 'right' as const
  }
]

const templateData = computed(() => {
  return Object.entries(templateStore.templates).map(([name, template]) => ({
    name,
    template
  }))
})

const templateDescriptions = computed(() => {
  if (!viewTemplateData.value) return []
  
  const template = viewTemplateData.value.template
  return [
    {
      label: '模板名称',
      value: viewTemplateData.value.name
    },
    {
      label: '索引模式',
      value: template.index_patterns.join(', ')
    },
    {
      label: '版本',
      value: template.version || '-'
    },
    {
      label: '优先级',
      value: template.order !== undefined ? template.order : '-'
    }
  ]
})

// 查看模板
const viewTemplate = async (record: { name: string; template: IndexTemplate }) => {
  try {
    const templateDetail = await templateStore.fetchTemplate(record.name)
    if (templateDetail) {
      viewTemplateData.value = {
        name: record.name,
        template: templateDetail
      }
      showViewDialog.value = true
    }
  } catch (error) {
    console.error('获取模板详情失败:', error)
  }
}

// 编辑模板
const editTemplate = async (record: { name: string; template: IndexTemplate }) => {
  try {
    const templateDetail = await templateStore.fetchTemplate(record.name)
    if (templateDetail) {
      currentTemplate.value = {
        name: record.name,
        template: templateDetail
      }
      
      templateForm.name = record.name
      templateForm.index_patterns = templateDetail.index_patterns
      templateForm.version = templateDetail.version
      templateForm.order = templateDetail.order
      templateForm.settings = templateDetail.settings ? JSON.stringify(templateDetail.settings, null, 2) : ''
      templateForm.mappings = templateDetail.mappings ? JSON.stringify(templateDetail.mappings, null, 2) : ''
      templateForm.aliases = templateDetail.aliases ? JSON.stringify(templateDetail.aliases, null, 2) : ''
      
      showCreateDialog.value = true
    }
  } catch (error) {
    console.error('获取模板详情失败:', error)
  }
}

// 删除模板
const deleteTemplate = async (name: string) => {
  await templateStore.deleteTemplate(name)
}

// 保存模板
const handleSaveTemplate = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    // 构建模板请求对象
    const template: IndexTemplate = {
      name: templateForm.name,
      index_patterns: templateForm.index_patterns
    }

    if (templateForm.version !== undefined) {
      template.version = templateForm.version
    }

    if (templateForm.order !== undefined) {
      template.order = templateForm.order
    }

    if (templateForm.settings.trim()) {
      try {
        template.settings = JSON.parse(templateForm.settings)
      } catch (error) {
        Message.error('设置格式错误，请检查JSON格式')
        return
      }
    }

    if (templateForm.mappings.trim()) {
      try {
        template.mappings = JSON.parse(templateForm.mappings)
      } catch (error) {
        Message.error('映射格式错误，请检查JSON格式')
        return
      }
    }

    if (templateForm.aliases.trim()) {
      try {
        template.aliases = JSON.parse(templateForm.aliases)
      } catch (error) {
        Message.error('别名格式错误，请检查JSON格式')
        return
      }
    }

    // 验证模板
    const validation = templateStore.validateTemplate(template)
    if (!validation.isValid) {
      Message.error(validation.errors[0])
      return
    }

    const request: TemplateRequest = {
      name: templateForm.name,
      template
    }

    const success = await templateStore.putTemplate(request)
    if (success) {
      showCreateDialog.value = false
      resetForm()
    }
  } catch (error: any) {
    Message.error(error.message || '保存模板失败')
  }
}

// 取消编辑
const handleCancelEdit = () => {
  showCreateDialog.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  currentTemplate.value = null
  templateForm.name = ''
  templateForm.index_patterns = []
  templateForm.version = undefined
  templateForm.order = undefined
  templateForm.settings = ''
  templateForm.mappings = ''
  templateForm.aliases = ''
}

onMounted(async () => {
  await templateStore.fetchTemplates()
})
</script>

<style scoped>
.templates {
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

.templates-table {
  flex: 1;
}

.template-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.patterns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.text-gray {
  color: var(--gray-400);
}

.template-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.json-sections {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.json-section h4 {
  margin: 0 0 0.5rem 0;
  color: var(--gray-700);
  font-weight: 600;
}

.json-content {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  padding: 1rem;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-input {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.875rem;
}

.form-help {
  font-size: 0.75rem;
  color: var(--gray-500);
  margin-top: 0.25rem;
}

:deep(.arco-table-cell) {
  padding: 12px 16px;
}

:deep(.arco-descriptions-item-label) {
  font-weight: 600;
  color: var(--gray-700);
}
</style>