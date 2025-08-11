<template>
  <div class="json-editor">
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
import { ref, computed, watch, onMounted } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { linter } from '@codemirror/lint'
import { IconExclamationCircleFill, IconCheckCircleFill } from '@arco-design/web-vue/es/icon'

interface Props {
  modelValue?: string
  placeholder?: string
  height?: string
  theme?: 'light' | 'dark'
  showValidation?: boolean
  formatOnBlur?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'validation-change', isValid: boolean, error?: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入JSON...',
  height: '200px',
  theme: 'light',
  showValidation: true,
  formatOnBlur: true
})

const emit = defineEmits<Emits>()

const internalValue = ref(props.modelValue)
const validationError = ref<string>('')
const showValidationSuccess = ref(false)

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
      }
    })
  ]

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
.json-editor {
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
</style>