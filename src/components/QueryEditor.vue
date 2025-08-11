<template>
  <div class="query-editor">
    <codemirror
      v-model="internalValue"
      :style="{ height: height }"
      :extensions="extensions"
      :placeholder="placeholder"
      @change="handleChange"
      @blur="handleBlur"
    />
    <div v-if="validationError" class="validation-error">
      <icon-exclamation-circle-fill />
      {{ validationError }}
    </div>
    <div v-if="showValidationSuccess && !validationError && internalValue.trim()" class="validation-success">
      <icon-check-circle-fill />
      JSON格式正确
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { linter } from '@codemirror/lint'
import { autocompletion, CompletionContext, Completion } from '@codemirror/autocomplete'
import { IconExclamationCircleFill, IconCheckCircleFill } from '@arco-design/web-vue/es/icon'
import { Api } from '../api'

interface Props {
  modelValue?: string
  placeholder?: string
  height?: string
  theme?: 'light' | 'dark'
  showValidation?: boolean
  formatOnBlur?: boolean
  connectionId?: string
  selectedIndex?: string
  enableAutocomplete?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'validation-change', isValid: boolean, error?: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入查询JSON...',
  height: '200px',
  theme: 'light',
  showValidation: true,
  formatOnBlur: true,
  enableAutocomplete: true
})

const emit = defineEmits<Emits>()

const internalValue = ref(props.modelValue)
const validationError = ref<string>('')
const showValidationSuccess = ref(false)
const fieldNames = ref<string[]>([])

// Elasticsearch query syntax keywords
const elasticsearchKeywords = [
  // Query types
  'match', 'match_all', 'match_phrase', 'match_phrase_prefix', 'multi_match',
  'term', 'terms', 'range', 'exists', 'prefix', 'wildcard', 'regexp', 'fuzzy',
  'type', 'ids',
  
  // Compound queries
  'bool', 'dis_max', 'function_score', 'boosting', 'constant_score',
  
  // Bool query clauses
  'must', 'must_not', 'should', 'filter',
  
  // Aggregations
  'aggs', 'aggregations', 'terms', 'date_histogram', 'histogram', 'range',
  'avg', 'max', 'min', 'sum', 'stats', 'extended_stats', 'value_count',
  'percentiles', 'percentile_ranks', 'cardinality', 'geo_distance', 'nested',
  
  // Common parameters
  'query', 'size', 'from', 'sort', '_source', 'highlight', 'fields',
  'boost', 'minimum_should_match', 'tie_breaker', 'cutoff_frequency',
  'zero_terms_query', 'lenient', 'analyze_wildcard', 'allow_leading_wildcard',
  'enable_position_increments', 'phrase_slop', 'max_expansions',
  'prefix_length', 'transpositions', 'auto_generate_synonyms_phrase_query',
  'fuzzy_transpositions', 'fuzzy_max_expansions', 'fuzzy_prefix_length',
  'operator', 'analyzer', 'quote_analyzer', 'quote_field_suffix',
  'type', 'slop', 'in_order', 'collect_payloads',
  
  // Range parameters
  'gte', 'gt', 'lte', 'lt', 'format', 'time_zone', 'relation',
  
  // Sort options
  'asc', 'desc', 'order', 'mode', 'nested', 'unmapped_type',
  
  // Aggregation parameters
  'field', 'script', 'interval', 'calendar_interval', 'fixed_interval',
  'missing', 'keyed', 'bucket_count_ks', 'shard_size', 'show_term_doc_count_error',
  'execution_hint', 'include', 'exclude', 'collect_mode',
  
  // Script parameters
  'source', 'lang', 'params',
  
  // Common values
  'true', 'false', 'null'
]

// JSON validation function
const validateJson = (value: string): { isValid: boolean; error?: string } => {
  if (!value.trim()) {
    return { isValid: true }
  }

  try {
    JSON.parse(value)
    return { isValid: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON error'
    return { isValid: false, error: `JSON格式错误: ${message}` }
  }
}

// JSON linter for CodeMirror
const jsonLinter = linter((view) => {
  const text = view.state.doc.toString()
  const validation = validateJson(text)
  
  if (!validation.isValid && text.trim()) {
    return [{
      from: 0,
      to: text.length,
      severity: 'error',
      message: validation.error || 'JSON format error'
    }]
  }
  
  return []
})

// Autocomplete function
const queryAutocomplete = (context: CompletionContext) => {
  const word = context.matchBefore(/\w*/)
  if (!word || (word.from === word.to && !context.explicit)) return null
  
  const completions: Completion[] = []
  
  // Add field names
  for (const field of fieldNames.value) {
    if (field.toLowerCase().includes(word.text.toLowerCase())) {
      let detail = '字段名'
      let boost = 0
      
      // Categorize fields for better UX
      if (field.startsWith('_')) {
        detail = '元字段'
        boost = -1
      } else if (field.includes('.keyword')) {
        detail = '精确匹配字段'
        boost = 0.5
      } else if (field.includes('.')) {
        detail = '嵌套字段'
        boost = 0.3
      } else if (field === '@timestamp') {
        detail = '时间字段'
        boost = 1
      }
      
      completions.push({
        label: field,
        type: 'property',
        detail,
        boost
      })
    }
  }
  
  // Add Elasticsearch keywords
  for (const keyword of elasticsearchKeywords) {
    if (keyword.toLowerCase().includes(word.text.toLowerCase())) {
      completions.push({
        label: keyword,
        type: 'keyword',
        detail: 'ES关键字',
        boost: 1
      })
    }
  }
  
  return {
    from: word.from,
    options: completions.sort((a, b) => (b.boost || 0) - (a.boost || 0))
  }
}

// Load field names when index changes
const loadFieldNames = async () => {
  if (!props.connectionId || !props.selectedIndex || !props.enableAutocomplete) {
    fieldNames.value = []
    return
  }

  try {
    const fields = await Api.getFieldNames(props.connectionId, props.selectedIndex)
    fieldNames.value = fields
    console.log(`Loaded ${fields.length} field names for index: ${props.selectedIndex}`)
  } catch (error) {
    console.warn('Failed to load field names:', error)
    fieldNames.value = []
  }
}

// Debounced field loading to avoid too many API calls
let loadFieldNamesTimeout: NodeJS.Timeout | null = null
const debouncedLoadFieldNames = () => {
  if (loadFieldNamesTimeout) {
    clearTimeout(loadFieldNamesTimeout)
  }
  loadFieldNamesTimeout = setTimeout(loadFieldNames, 300)
}

// Watch for changes in connection and index
watch([() => props.connectionId, () => props.selectedIndex], () => {
  debouncedLoadFieldNames()
}, { immediate: true })

// CodeMirror extensions
const extensions = computed(() => {
  const baseExtensions = [
    json(),
    jsonLinter,
    EditorView.lineWrapping,
    EditorView.theme({
      '&': {
        fontSize: '14px',
        fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace'
      },
      '.cm-focused': {
        outline: 'none'
      },
      '.cm-editor': {
        borderRadius: '8px',
        border: validationError.value ? '1px solid #f53f3f' : '1px solid #e5e7eb'
      },
      '.cm-content': {
        padding: '12px',
        minHeight: '120px'
      },
      '.cm-lint-marker-error': {
        background: '#f53f3f'
      },
      '.cm-diagnostic-error': {
        borderLeft: '3px solid #f53f3f',
        paddingLeft: '8px'
      },
      '.cm-tooltip-autocomplete': {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontSize: '13px'
      },
      '.cm-completionLabel': {
        fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace'
      },
      '.cm-completionDetail': {
        fontStyle: 'italic',
        color: '#6b7280'
      }
    })
  ]

  if (props.enableAutocomplete) {
    baseExtensions.push(autocompletion({
      override: [queryAutocomplete]
    }))
  }

  if (props.theme === 'dark') {
    baseExtensions.push(oneDark)
  }

  return baseExtensions
})

const handleChange = (value: string) => {
  internalValue.value = value
  
  // Validate JSON
  const validation = validateJson(value)
  validationError.value = validation.error || ''
  showValidationSuccess.value = validation.isValid && value.trim().length > 0
  
  emit('update:modelValue', value)
  emit('change', value)
  emit('validation-change', validation.isValid, validation.error)
}

const handleBlur = () => {
  if (props.formatOnBlur && internalValue.value.trim()) {
    try {
      const parsed = JSON.parse(internalValue.value)
      const formatted = JSON.stringify(parsed, null, 2)
      if (formatted !== internalValue.value) {
        internalValue.value = formatted
        emit('update:modelValue', formatted)
        emit('change', formatted)
      }
    } catch (error) {
      // Don't format if JSON is invalid
    }
  }
}

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue !== internalValue.value) {
    internalValue.value = newValue
  }
})

// Initial validation
onMounted(() => {
  if (internalValue.value) {
    const validation = validateJson(internalValue.value)
    validationError.value = validation.error || ''
    showValidationSuccess.value = validation.isValid && internalValue.value.trim().length > 0
    emit('validation-change', validation.isValid, validation.error)
  }
})
</script>

<style scoped>
.query-editor {
  position: relative;
}

.validation-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.875rem;
}

.validation-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  color: #16a34a;
  font-size: 0.875rem;
}

:deep(.cm-editor) {
  transition: border-color 0.2s ease;
}

:deep(.cm-editor:focus-within) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:deep(.cm-diagnostic) {
  background: #fef2f2;
  border-radius: 4px;
  padding: 4px 8px;
  margin: 2px 0;
  font-size: 0.875rem;
}

/* Autocomplete styling */
:deep(.cm-tooltip-autocomplete ul li) {
  padding: 8px 12px !important;
  cursor: pointer !important;
}

:deep(.cm-tooltip-autocomplete ul li[aria-selected]) {
  background: #f3f4f6 !important;
  color: #1f2937 !important;
}

:deep(.cm-completionIcon-property::after) {
  content: "🏷️";
  font-size: 12px;
}

:deep(.cm-completionIcon-keyword::after) {
  content: "🔤";
  font-size: 12px;
}
</style>