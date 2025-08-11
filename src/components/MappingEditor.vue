<template>
  <div class="mapping-editor">
    <a-card :bordered="false">
      <template #title>
        <div class="header">
          <a-space>
            <icon-code />
            <span>映射编辑器</span>
          </a-space>
          <a-space>
            <a-button type="outline" size="small" @click="addField">
              <template #icon>
                <icon-plus />
              </template>
              添加字段
            </a-button>
            <a-button type="outline" size="small" @click="importMapping">
              <template #icon>
                <icon-import />
              </template>
              导入映射
            </a-button>
            <a-button type="primary" size="small" @click="previewMapping">
              <template #icon>
                <icon-eye />
              </template>
              预览JSON
            </a-button>
          </a-space>
        </div>
      </template>

      <div class="mapping-content">
        <div v-if="fields.length === 0" class="empty-state">
          <a-empty description="暂无字段映射">
            <a-button type="primary" @click="addField">添加第一个字段</a-button>
          </a-empty>
        </div>

        <div v-else class="fields-container">
          <draggable
            v-model="fields"
            item-key="name"
            ghost-class="field-ghost"
            :animation="200"
          >
            <template #item="{ element: field, index }">
              <div class="field-item" :key="`field-${index}`">
                <field-editor
                  :model-value="field"
                  :index="index"
                  :nested-level="0"
                  @update:model-value="updateField(index, $event)"
                  @remove="removeField(index)"
                  @add-nested="addNestedField(field)"
                />
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </a-card>

    <!-- 预览映射对话框 -->
    <a-modal
      v-model:visible="previewVisible"
      title="映射JSON预览"
      :footer="false"
      width="800px"
    >
      <a-typography-paragraph>
        <pre class="json-preview">{{ formattedMapping }}</pre>
      </a-typography-paragraph>
      <template #footer>
        <a-space>
          <a-button @click="previewVisible = false">关闭</a-button>
          <a-button type="primary" @click="copyMapping">复制JSON</a-button>
        </a-space>
      </template>
    </a-modal>

    <!-- 导入映射对话框 -->
    <a-modal
      v-model:visible="importVisible"
      title="导入映射"
      @ok="handleImportMapping"
      @cancel="importVisible = false"
      width="600px"
    >
      <a-textarea
        v-model="importJson"
        placeholder="请粘贴映射JSON..."
        :rows="10"
        class="import-textarea"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconCode,
  IconPlus,
  IconImport,
  IconEye
} from '@arco-design/web-vue/es/icon'
import draggable from 'vuedraggable'
import type { MappingField } from '../types'
import FieldEditor from './FieldEditor.vue'
import { generateFieldId, createDefaultField } from '../utils/mapping'

interface Props {
  modelValue?: Record<string, any>
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'change', value: Record<string, any>): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  readonly: false
})

const emit = defineEmits<Emits>()

const fields = ref<MappingField[]>([])
const previewVisible = ref(false)
const importVisible = ref(false)
const importJson = ref('')

// 从props初始化字段
const initializeFields = () => {
  if (props.modelValue && props.modelValue.properties) {
    fields.value = Object.entries(props.modelValue.properties).map(([name, mapping]: [string, any]) => ({
      name,
      type: mapping.type || 'text',
      analyzer: mapping.analyzer,
      index: mapping.index,
      store: mapping.store,
      doc_values: mapping.doc_values,
      ignore_above: mapping.ignore_above,
      copy_to: mapping.copy_to,
      boost: mapping.boost,
      null_value: mapping.null_value,
      format: mapping.format,
      scaling_factor: mapping.scaling_factor,
      properties: mapping.properties || {},
      fields: mapping.fields || {}
    }))
  }
}

// 监听props变化
watch(() => props.modelValue, () => {
  initializeFields()
}, { immediate: true, deep: true })

// 计算映射JSON
const computedMapping = computed(() => {
  if (fields.value.length === 0) return {}
  
  const properties: Record<string, any> = {}
  
  fields.value.forEach(field => {
    if (!field.name.trim()) return
    
    const mapping: any = {
      type: field.type
    }
    
    // 添加非默认配置
    if (field.analyzer && field.type === 'text') mapping.analyzer = field.analyzer
    if (field.index !== undefined) mapping.index = field.index
    if (field.store !== undefined) mapping.store = field.store
    if (field.doc_values !== undefined) mapping.doc_values = field.doc_values
    if (field.copy_to) mapping.copy_to = field.copy_to
    if (field.boost && field.boost !== 1) mapping.boost = field.boost
    if (field.null_value !== undefined) mapping.null_value = field.null_value
    if (field.format) mapping.format = field.format
    if (field.scaling_factor) mapping.scaling_factor = field.scaling_factor
    
    // 嵌套对象
    if (field.properties && Object.keys(field.properties).length > 0) {
      mapping.properties = field.properties
    }
    
    // 多字段
    if (field.fields && Object.keys(field.fields).length > 0) {
      mapping.fields = field.fields
    }
    
    properties[field.name] = mapping
  })
  
  return {
    properties
  }
})

// 格式化的映射JSON
const formattedMapping = computed(() => {
  return JSON.stringify(computedMapping.value, null, 2)
})

// 监听字段变化，更新模型值
watch(fields, () => {
  const mapping = computedMapping.value
  emit('update:modelValue', mapping)
  emit('change', mapping)
}, { deep: true })

// 添加字段
const addField = () => {
  const newField = createDefaultField()
  fields.value.push(newField)
}

// 更新字段
const updateField = (index: number, field: MappingField) => {
  fields.value[index] = field
}

// 移除字段
const removeField = (index: number) => {
  fields.value.splice(index, 1)
}

// 添加嵌套字段
const addNestedField = (parentField: MappingField) => {
  if (!parentField.properties) {
    parentField.properties = {}
  }
  
  const nestedField = createDefaultField()
  const fieldName = `field_${Object.keys(parentField.properties).length + 1}`
  nestedField.name = fieldName
  
  parentField.properties[fieldName] = nestedField
}

// 预览映射
const previewMapping = () => {
  previewVisible.value = true
}

// 复制映射JSON
const copyMapping = async () => {
  try {
    await navigator.clipboard.writeText(formattedMapping.value)
    Message.success('映射JSON已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    Message.error('复制失败')
  }
}

// 导入映射
const importMapping = () => {
  importJson.value = ''
  importVisible.value = true
}

// 处理导入映射
const handleImportMapping = () => {
  try {
    const parsed = JSON.parse(importJson.value)
    
    if (!parsed.properties) {
      Message.error('导入的JSON必须包含properties字段')
      return
    }
    
    // 转换为字段数组
    fields.value = Object.entries(parsed.properties).map(([name, mapping]: [string, any]) => ({
      name,
      type: mapping.type || 'text',
      analyzer: mapping.analyzer,
      index: mapping.index,
      store: mapping.store,
      doc_values: mapping.doc_values,
      ignore_above: mapping.ignore_above,
      copy_to: mapping.copy_to,
      boost: mapping.boost,
      null_value: mapping.null_value,
      format: mapping.format,
      scaling_factor: mapping.scaling_factor,
      properties: mapping.properties || {},
      fields: mapping.fields || {}
    }))
    
    importVisible.value = false
    Message.success('映射导入成功')
  } catch (error) {
    console.error('导入映射失败:', error)
    Message.error('导入映射失败：JSON格式无效')
  }
}

// 初始化
initializeFields()
</script>

<style scoped lang="less">
.mapping-editor {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .mapping-content {
    .empty-state {
      text-align: center;
      padding: 40px 0;
    }

    .fields-container {
      .field-item {
        margin-bottom: 12px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }

      .field-ghost {
        opacity: 0.5;
      }
    }
  }

  .json-preview {
    background: #f7f8fa;
    padding: 16px;
    border-radius: 4px;
    max-height: 400px;
    overflow-y: auto;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    color: #1d2129;
  }

  .import-textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
  }
}
</style>