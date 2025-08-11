<template>
  <div class="field-editor">
    <a-card size="small" :bordered="true">
      <template #title>
        <div class="field-header">
          <a-space>
            <icon-menu class="drag-handle" />
            <a-input
              v-model="localField.name"
              placeholder="字段名称"
              size="small"
              class="field-name-input"
              :class="{ 'error': hasNameError }"
            />
            <a-select
              v-model="localField.type"
              size="small"
              class="field-type-select"
              @change="onTypeChange"
            >
              <a-optgroup label="文本类型">
                <a-option :value="ESFieldType.TEXT">{{ fieldTypeConfigs[ESFieldType.TEXT].label }}</a-option>
                <a-option :value="ESFieldType.KEYWORD">{{ fieldTypeConfigs[ESFieldType.KEYWORD].label }}</a-option>
              </a-optgroup>
              <a-optgroup label="数字类型">
                <a-option :value="ESFieldType.LONG">{{ fieldTypeConfigs[ESFieldType.LONG].label }}</a-option>
                <a-option :value="ESFieldType.INTEGER">{{ fieldTypeConfigs[ESFieldType.INTEGER].label }}</a-option>
                <a-option :value="ESFieldType.SHORT">{{ fieldTypeConfigs[ESFieldType.SHORT].label }}</a-option>
                <a-option :value="ESFieldType.BYTE">{{ fieldTypeConfigs[ESFieldType.BYTE].label }}</a-option>
                <a-option :value="ESFieldType.DOUBLE">{{ fieldTypeConfigs[ESFieldType.DOUBLE].label }}</a-option>
                <a-option :value="ESFieldType.FLOAT">{{ fieldTypeConfigs[ESFieldType.FLOAT].label }}</a-option>
                <a-option :value="ESFieldType.HALF_FLOAT">{{ fieldTypeConfigs[ESFieldType.HALF_FLOAT].label }}</a-option>
                <a-option :value="ESFieldType.SCALED_FLOAT">{{ fieldTypeConfigs[ESFieldType.SCALED_FLOAT].label }}</a-option>
              </a-optgroup>
              <a-optgroup label="日期类型">
                <a-option :value="ESFieldType.DATE">{{ fieldTypeConfigs[ESFieldType.DATE].label }}</a-option>
                <a-option :value="ESFieldType.DATE_RANGE">{{ fieldTypeConfigs[ESFieldType.DATE_RANGE].label }}</a-option>
              </a-optgroup>
              <a-optgroup label="布尔类型">
                <a-option :value="ESFieldType.BOOLEAN">{{ fieldTypeConfigs[ESFieldType.BOOLEAN].label }}</a-option>
              </a-optgroup>
              <a-optgroup label="对象类型">
                <a-option :value="ESFieldType.OBJECT">{{ fieldTypeConfigs[ESFieldType.OBJECT].label }}</a-option>
                <a-option :value="ESFieldType.NESTED">{{ fieldTypeConfigs[ESFieldType.NESTED].label }}</a-option>
              </a-optgroup>
              <a-optgroup label="其他类型">
                <a-option :value="ESFieldType.IP">{{ fieldTypeConfigs[ESFieldType.IP].label }}</a-option>
                <a-option :value="ESFieldType.GEO_POINT">{{ fieldTypeConfigs[ESFieldType.GEO_POINT].label }}</a-option>
                <a-option :value="ESFieldType.COMPLETION">{{ fieldTypeConfigs[ESFieldType.COMPLETION].label }}</a-option>
                <a-option :value="ESFieldType.BINARY">{{ fieldTypeConfigs[ESFieldType.BINARY].label }}</a-option>
              </a-optgroup>
            </a-select>
          </a-space>
          <a-space>
            <a-button
              v-if="canAddNested"
              type="text"
              size="small"
              @click="$emit('addNested')"
            >
              <template #icon>
                <icon-plus />
              </template>
            </a-button>
            <a-button
              type="text"
              size="small"
              @click="showAdvanced = !showAdvanced"
              :class="{ active: showAdvanced }"
            >
              <template #icon>
                <icon-settings />
              </template>
            </a-button>
            <a-button
              type="text"
              size="small"
              status="danger"
              @click="$emit('remove')"
            >
              <template #icon>
                <icon-delete />
              </template>
            </a-button>
          </a-space>
        </div>
      </template>

      <!-- 字段类型描述 -->
      <div class="field-description">
        <a-typography-text type="secondary" :style="{ fontSize: '12px' }">
          {{ fieldTypeConfigs[localField.type].description }}
        </a-typography-text>
      </div>

      <!-- 高级配置 -->
      <div v-if="showAdvanced" class="advanced-config">
        <a-divider :margin="8" />
        
        <a-row :gutter="16">
          <!-- 文本类型特有配置 -->
          <template v-if="localField.type === ESFieldType.TEXT">
            <a-col :span="8">
              <a-form-item label="分析器" size="small">
                <a-select
                  v-model="localField.analyzer"
                  size="small"
                  allow-clear
                  placeholder="选择分析器"
                >
                  <a-option
                    v-for="analyzer in commonAnalyzers"
                    :key="analyzer.value"
                    :value="analyzer.value"
                  >
                    {{ analyzer.label }}
                  </a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </template>

          <!-- 关键词类型特有配置 -->
          <template v-if="localField.type === ESFieldType.KEYWORD">
            <a-col :span="8">
              <a-form-item label="忽略长度限制" size="small">
                <a-input-number
                  v-model="localField.ignore_above"
                  size="small"
                  :min="0"
                  placeholder="256"
                />
              </a-form-item>
            </a-col>
          </template>

          <!-- 日期类型特有配置 -->
          <template v-if="localField.type === ESFieldType.DATE || localField.type === ESFieldType.DATE_RANGE">
            <a-col :span="8">
              <a-form-item label="日期格式" size="small">
                <a-select
                  v-model="localField.format"
                  size="small"
                  allow-clear
                  placeholder="选择格式"
                >
                  <a-option
                    v-for="format in commonDateFormats"
                    :key="format.value"
                    :value="format.value"
                  >
                    {{ format.label }}
                  </a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </template>

          <!-- 缩放浮点数特有配置 -->
          <template v-if="localField.type === ESFieldType.SCALED_FLOAT">
            <a-col :span="8">
              <a-form-item label="缩放因子" size="small">
                <a-input-number
                  v-model="localField.scaling_factor"
                  size="small"
                  :min="1"
                  placeholder="100"
                />
              </a-form-item>
            </a-col>
          </template>

          <!-- 通用配置 -->
          <template v-if="supportedProperties.includes('index')">
            <a-col :span="6">
              <a-form-item label="索引" size="small">
                <a-switch v-model="localField.index" size="small" />
              </a-form-item>
            </a-col>
          </template>

          <template v-if="supportedProperties.includes('store')">
            <a-col :span="6">
              <a-form-item label="存储" size="small">
                <a-switch v-model="localField.store" size="small" />
              </a-form-item>
            </a-col>
          </template>

          <template v-if="supportedProperties.includes('doc_values')">
            <a-col :span="6">
              <a-form-item label="文档值" size="small">
                <a-switch v-model="localField.doc_values" size="small" />
              </a-form-item>
            </a-col>
          </template>

          <template v-if="supportedProperties.includes('boost')">
            <a-col :span="8">
              <a-form-item label="权重提升" size="small">
                <a-input-number
                  v-model="localField.boost"
                  size="small"
                  :min="0"
                  :step="0.1"
                  placeholder="1.0"
                />
              </a-form-item>
            </a-col>
          </template>

          <template v-if="supportedProperties.includes('null_value')">
            <a-col :span="8">
              <a-form-item label="空值替换" size="small">
                <a-input
                  v-model="localField.null_value"
                  size="small"
                  placeholder="空值时的默认值"
                />
              </a-form-item>
            </a-col>
          </template>

          <template v-if="supportedProperties.includes('copy_to')">
            <a-col :span="12">
              <a-form-item label="复制到字段" size="small">
                <a-select
                  v-model="localField.copy_to"
                  mode="tags"
                  size="small"
                  placeholder="选择或输入字段名"
                  allow-clear
                />
              </a-form-item>
            </a-col>
          </template>
        </a-row>

        <!-- 字段验证错误 -->
        <div v-if="validationErrors.length > 0" class="validation-errors">
          <a-alert
            v-for="error in validationErrors"
            :key="error"
            :message="error"
            type="error"
            size="small"
            show-icon
            :style="{ marginBottom: '8px' }"
          />
        </div>
      </div>

      <!-- 嵌套字段 -->
      <div v-if="hasNestedFields" class="nested-fields">
        <a-divider :margin="8" />
        <div class="nested-fields-header">
          <a-typography-text strong>嵌套字段</a-typography-text>
          <a-button
            type="text"
            size="small"
            @click="addNestedField"
          >
            <template #icon>
              <icon-plus />
            </template>
            添加嵌套字段
          </a-button>
        </div>
        
        <div class="nested-fields-list">
          <div
            v-for="(nestedField, nestedName) in localField.properties"
            :key="nestedName"
            class="nested-field-item"
          >
            <!-- 简化的嵌套字段显示，避免递归组件问题 -->
            <a-card size="small">
              <template #title>
                <a-space>
                  <a-input
                    :model-value="nestedName"
                    size="small"
                    readonly
                    style="width: 150px;"
                  />
                  <a-tag>{{ nestedField.type }}</a-tag>
                  <a-button
                    type="text"
                    size="small"
                    status="danger"
                    @click="removeNestedField(nestedName)"
                  >
                    <template #icon>
                      <icon-delete />
                    </template>
                  </a-button>
                </a-space>
              </template>
              <a-typography-text type="secondary">
                嵌套字段：{{ nestedField.type }} 类型
              </a-typography-text>
            </a-card>
          </div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  IconMenu,
  IconPlus,
  IconSettings,
  IconDelete
} from '@arco-design/web-vue/es/icon'
import { ESFieldType, type MappingField } from '../types'
import {
  fieldTypeConfigs,
  getSupportedProperties,
  getDefaultProperties,
  validateMappingField,
  commonAnalyzers,
  commonDateFormats
} from '../utils/mapping'

interface Props {
  modelValue: MappingField
  index: number
  nestedLevel?: number
}

interface Emits {
  (e: 'update:modelValue', value: MappingField): void
  (e: 'remove'): void
  (e: 'addNested'): void
}

const props = withDefaults(defineProps<Props>(), {
  nestedLevel: 0
})

const emit = defineEmits<Emits>()

const localField = ref<MappingField>({ ...props.modelValue })
const showAdvanced = ref(false)

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  localField.value = { ...newValue }
}, { deep: true })

// 监听本地字段变化，向上传播
watch(localField, () => {
  emit('update:modelValue', { ...localField.value })
}, { deep: true })

// 计算属性
const supportedProperties = computed(() => {
  return getSupportedProperties(localField.value.type)
})

const canAddNested = computed(() => {
  return localField.value.type === ESFieldType.OBJECT || 
         localField.value.type === ESFieldType.NESTED
})

const hasNestedFields = computed(() => {
  return canAddNested.value && 
         localField.value.properties && 
         Object.keys(localField.value.properties).length > 0
})

const validationErrors = computed(() => {
  return validateMappingField(localField.value)
})

const hasNameError = computed(() => {
  return validationErrors.value.some(error => error.includes('字段名称'))
})

// 方法
const onTypeChange = (newType: ESFieldType) => {
  // 重置字段属性为新类型的默认值
  const defaultProps = getDefaultProperties(newType)
  
  // 保留字段名和ID
  const { name } = localField.value
  localField.value = {
    name,
    type: newType,
    ...defaultProps
  }
}

const addNestedField = () => {
  if (!localField.value.properties) {
    localField.value.properties = {}
  }
  
  const fieldCount = Object.keys(localField.value.properties).length
  const fieldName = `field_${fieldCount + 1}`
  
  localField.value.properties[fieldName] = {
    name: fieldName,
    type: ESFieldType.TEXT,
    index: true,
    store: false,
    doc_values: true
  }
}

const removeNestedField = (fieldName: string) => {
  if (localField.value.properties) {
    delete localField.value.properties[fieldName]
  }
}
</script>

<style scoped lang="less">
.field-editor {
  .field-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    
    .drag-handle {
      cursor: grab;
      color: #86909c;
      
      &:active {
        cursor: grabbing;
      }
    }
    
    .field-name-input {
      width: 200px;
      
      &.error {
        border-color: #f53f3f;
      }
    }
    
    .field-type-select {
      width: 150px;
    }
    
    .active {
      background-color: #e8f3ff;
      color: #165dff;
    }
  }
  
  .field-description {
    margin-bottom: 8px;
  }
  
  .advanced-config {
    .validation-errors {
      margin-top: 16px;
    }
  }
  
  .nested-fields {
    .nested-fields-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .nested-fields-list {
      .nested-field-item {
        margin-bottom: 8px;
        margin-left: 16px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}
</style>