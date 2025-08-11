<template>
  <div class="query-condition">
    <div class="condition-row">
      <!-- 字段选择 -->
      <a-select
        :model-value="condition.field"
        @update:model-value="updateField"
        placeholder="选择字段"
        style="width: 200px"
        allow-search
        size="small"
      >
        <a-option v-for="field in searchableFields" :key="field.name" :value="field.name">
          {{ field.name }}
          <template #suffix>
            <a-tag size="small" :color="getTypeColor(field.type)">
              {{ field.type }}
            </a-tag>
          </template>
        </a-option>
      </a-select>

      <!-- 操作符选择 -->
      <a-select
        :model-value="condition.operator"
        @update:model-value="updateOperator"
        style="width: 140px"
        size="small"
      >
        <a-option 
          v-for="op in availableOperators" 
          :key="op.value" 
          :value="op.value"
        >
          {{ op.label }}
        </a-option>
      </a-select>

      <!-- 值输入 -->
      <div class="value-input">
        <!-- 文本/关键字输入 -->
        <a-input
          v-if="needsTextInput"
          :model-value="condition.value"
          @update:model-value="updateValue"
          placeholder="输入值"
          size="small"
        />

        <!-- 数字输入 -->
        <a-input-number
          v-else-if="needsNumberInput"
          :model-value="condition.value"
          @update:model-value="updateValue"
          placeholder="输入数字"
          size="small"
          style="width: 150px"
        />

        <!-- 日期输入 -->
        <a-date-picker
          v-else-if="needsDateInput"
          :model-value="condition.value"
          @update:model-value="updateValue"
          placeholder="选择日期"
          size="small"
          style="width: 150px"
        />

        <!-- 布尔值输入 -->
        <a-select
          v-else-if="needsBooleanInput"
          :model-value="condition.value"
          @update:model-value="updateValue"
          size="small"
          style="width: 100px"
        >
          <a-option :value="true">是</a-option>
          <a-option :value="false">否</a-option>
        </a-select>

        <!-- 范围输入 -->
        <div v-else-if="needsRangeInput" class="range-input">
          <a-input-number
            v-if="isNumberType"
            :model-value="rangeValue[0]"
            @update:model-value="updateRangeStart"
            placeholder="最小值"
            size="small"
            style="width: 100px"
          />
          <a-input
            v-else
            :model-value="rangeValue[0]"
            @update:model-value="updateRangeStart"
            placeholder="起始值"
            size="small"
            style="width: 100px"
          />
          
          <span class="range-separator">~</span>
          
          <a-input-number
            v-if="isNumberType"
            :model-value="rangeValue[1]"
            @update:model-value="updateRangeEnd"
            placeholder="最大值"
            size="small"
            style="width: 100px"
          />
          <a-input
            v-else
            :model-value="rangeValue[1]"
            @update:model-value="updateRangeEnd"
            placeholder="结束值"
            size="small"
            style="width: 100px"
          />
        </div>

        <!-- 多值输入 -->
        <a-input-tag
          v-else-if="needsMultiInput"
          :model-value="multiValue"
          @update:model-value="updateMultiValue"
          placeholder="输入多个值"
          size="small"
          style="width: 200px"
        />

        <!-- 正则表达式输入 -->
        <a-input
          v-else-if="needsRegexInput"
          :model-value="condition.value"
          @update:model-value="updateValue"
          placeholder="输入正则表达式"
          size="small"
        />

        <!-- 存在性检查无需输入 -->
        <span v-else-if="needsNoInput" class="no-input-text">
          无需输入值
        </span>
      </div>

      <!-- 删除按钮 -->
      <a-button size="small" @click="removeCondition" type="text" status="danger">
        <template #icon>
          <icon-delete />
        </template>
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { QueryCondition, FieldInfo } from '../types'
import { IconDelete } from '@arco-design/web-vue/es/icon'

interface Props {
  condition: QueryCondition
  fields: FieldInfo[]
}

interface Emits {
  (e: 'update', conditionId: string, updates: any): void
  (e: 'remove', conditionId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const searchableFields = computed(() => {
  return props.fields.filter(field => field.searchable)
})

const currentField = computed(() => {
  return props.fields.find(field => field.name === props.condition.field)
})

const isTextType = computed(() => {
  return currentField.value?.type === 'text'
})

const isKeywordType = computed(() => {
  return currentField.value?.type === 'keyword'
})

const isNumberType = computed(() => {
  return ['long', 'integer', 'short', 'byte', 'double', 'float'].includes(currentField.value?.type || '')
})

const isDateType = computed(() => {
  return currentField.value?.type === 'date'
})

const isBooleanType = computed(() => {
  return currentField.value?.type === 'boolean'
})

const availableOperators = computed(() => {
  const baseOperators = [
    { value: 'equals', label: '等于' },
    { value: 'not_equals', label: '不等于' },
    { value: 'exists', label: '存在' },
    { value: 'not_exists', label: '不存在' }
  ]

  if (isTextType.value || isKeywordType.value) {
    baseOperators.push(
      { value: 'contains', label: '包含' },
      { value: 'starts_with', label: '开头是' },
      { value: 'ends_with', label: '结尾是' },
      { value: 'regex', label: '正则匹配' }
    )
  }

  if (isNumberType.value || isDateType.value) {
    baseOperators.push(
      { value: 'greater_than', label: '大于' },
      { value: 'greater_equal', label: '大于等于' },
      { value: 'less_than', label: '小于' },
      { value: 'less_equal', label: '小于等于' },
      { value: 'between', label: '在范围内' }
    )
  }

  baseOperators.push(
    { value: 'in', label: '在列表中' },
    { value: 'not_in', label: '不在列表中' }
  )

  return baseOperators
})

const needsTextInput = computed(() => {
  return ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with'].includes(props.condition.operator) && 
         !isNumberType.value && !isDateType.value && !isBooleanType.value
})

const needsNumberInput = computed(() => {
  return ['equals', 'not_equals', 'greater_than', 'greater_equal', 'less_than', 'less_equal'].includes(props.condition.operator) && 
         isNumberType.value
})

const needsDateInput = computed(() => {
  return ['equals', 'not_equals', 'greater_than', 'greater_equal', 'less_than', 'less_equal'].includes(props.condition.operator) && 
         isDateType.value
})

const needsBooleanInput = computed(() => {
  return ['equals', 'not_equals'].includes(props.condition.operator) && isBooleanType.value
})

const needsRangeInput = computed(() => {
  return props.condition.operator === 'between'
})

const needsMultiInput = computed(() => {
  return ['in', 'not_in'].includes(props.condition.operator)
})

const needsRegexInput = computed(() => {
  return props.condition.operator === 'regex'
})

const needsNoInput = computed(() => {
  return ['exists', 'not_exists'].includes(props.condition.operator)
})

const rangeValue = computed(() => {
  return Array.isArray(props.condition.value) ? props.condition.value : ['', '']
})

const multiValue = computed(() => {
  return Array.isArray(props.condition.value) ? props.condition.value : []
})

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'text': 'blue',
    'keyword': 'green',
    'long': 'orange',
    'integer': 'orange',
    'double': 'orange',
    'float': 'orange',
    'date': 'purple',
    'boolean': 'red'
  }
  return colors[type] || 'gray'
}

const updateField = (field: string) => {
  const fieldInfo = props.fields.find(f => f.name === field)
  emit('update', props.condition.id, { 
    field, 
    dataType: fieldInfo?.type || 'text',
    value: '', // 清空值
    operator: 'equals' // 重置操作符
  })
}

const updateOperator = (operator: string) => {
  emit('update', props.condition.id, { operator, value: '' }) // 清空值
}

const updateValue = (value: any) => {
  emit('update', props.condition.id, { value })
}

const updateRangeStart = (value: any) => {
  const current = Array.isArray(props.condition.value) ? props.condition.value : ['', '']
  current[0] = value
  emit('update', props.condition.id, { value: [...current] })
}

const updateRangeEnd = (value: any) => {
  const current = Array.isArray(props.condition.value) ? props.condition.value : ['', '']
  current[1] = value
  emit('update', props.condition.id, { value: [...current] })
}

const updateMultiValue = (values: string[]) => {
  emit('update', props.condition.id, { value: values })
}

const removeCondition = () => {
  emit('remove', props.condition.id)
}
</script>

<style scoped>
.query-condition {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  padding: 0.75rem;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.value-input {
  flex: 1;
  min-width: 150px;
}

.range-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.range-separator {
  color: var(--gray-500);
  font-weight: bold;
}

.no-input-text {
  color: var(--gray-500);
  font-style: italic;
  padding: 0 0.75rem;
}

:deep(.arco-select-option-suffix) {
  margin-left: 0.5rem;
}
</style>