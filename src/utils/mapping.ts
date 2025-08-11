import { MappingField, ESFieldType } from '../types'

// 生成字段ID
export function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 创建默认字段
export function createDefaultField(): MappingField {
  return {
    name: '',
    type: ESFieldType.TEXT,
    index: true,
    store: false,
    doc_values: true
  }
}

// 字段类型配置
export const fieldTypeConfigs: Record<ESFieldType, {
  label: string
  description: string
  supportedProperties: string[]
  defaultProperties?: Partial<MappingField>
}> = {
  [ESFieldType.TEXT]: {
    label: 'Text',
    description: '全文搜索字段，会被分析器处理',
    supportedProperties: ['analyzer', 'index', 'store', 'boost', 'copy_to', 'fields'],
    defaultProperties: {
      index: true,
      store: false
    }
  },
  [ESFieldType.KEYWORD]: {
    label: 'Keyword',
    description: '精确值字段，不会被分析器处理',
    supportedProperties: ['index', 'store', 'doc_values', 'ignore_above', 'null_value'],
    defaultProperties: {
      index: true,
      doc_values: true,
      ignore_above: 256
    }
  },
  [ESFieldType.LONG]: {
    label: 'Long',
    description: '长整型数字字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value', 'coerce'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.INTEGER]: {
    label: 'Integer',
    description: '整型数字字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value', 'coerce'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.SHORT]: {
    label: 'Short',
    description: '短整型数字字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value', 'coerce'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.BYTE]: {
    label: 'Byte',
    description: '字节数字字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value', 'coerce'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.DOUBLE]: {
    label: 'Double',
    description: '双精度浮点数字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value', 'coerce'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.FLOAT]: {
    label: 'Float',
    description: '单精度浮点数字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value', 'coerce'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.HALF_FLOAT]: {
    label: 'Half Float',
    description: '半精度浮点数字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value', 'coerce'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.SCALED_FLOAT]: {
    label: 'Scaled Float',
    description: '缩放浮点数字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value', 'coerce', 'scaling_factor'],
    defaultProperties: {
      index: true,
      doc_values: true,
      scaling_factor: 100
    }
  },
  [ESFieldType.DATE]: {
    label: 'Date',
    description: '日期字段',
    supportedProperties: ['index', 'store', 'doc_values', 'format', 'null_value'],
    defaultProperties: {
      index: true,
      doc_values: true,
      format: 'strict_date_optional_time||epoch_millis'
    }
  },
  [ESFieldType.BOOLEAN]: {
    label: 'Boolean',
    description: '布尔值字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.BINARY]: {
    label: 'Binary',
    description: '二进制字段',
    supportedProperties: ['store'],
    defaultProperties: {
      store: false
    }
  },
  [ESFieldType.OBJECT]: {
    label: 'Object',
    description: '对象字段',
    supportedProperties: ['properties'],
    defaultProperties: {}
  },
  [ESFieldType.NESTED]: {
    label: 'Nested',
    description: '嵌套对象字段',
    supportedProperties: ['properties'],
    defaultProperties: {}
  },
  [ESFieldType.IP]: {
    label: 'IP',
    description: 'IP地址字段',
    supportedProperties: ['index', 'store', 'doc_values', 'null_value'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.GEO_POINT]: {
    label: 'Geo Point',
    description: '地理坐标点字段',
    supportedProperties: ['index', 'store', 'doc_values'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.GEO_SHAPE]: {
    label: 'Geo Shape',
    description: '地理形状字段',
    supportedProperties: ['index', 'store'],
    defaultProperties: {
      index: true,
      store: false
    }
  },
  [ESFieldType.COMPLETION]: {
    label: 'Completion',
    description: '自动完成字段',
    supportedProperties: ['analyzer', 'search_analyzer', 'preserve_separators', 'preserve_position_increments', 'max_input_length'],
    defaultProperties: {}
  },
  [ESFieldType.TOKEN_COUNT]: {
    label: 'Token Count',
    description: 'Token数量字段',
    supportedProperties: ['analyzer', 'index', 'store', 'doc_values'],
    defaultProperties: {
      index: true,
      doc_values: true
    }
  },
  [ESFieldType.MURMUR3]: {
    label: 'Murmur3',
    description: 'Murmur3哈希字段',
    supportedProperties: ['store'],
    defaultProperties: {
      store: false
    }
  },
  [ESFieldType.ANNOTATED_TEXT]: {
    label: 'Annotated Text',
    description: '带注释的文本字段',
    supportedProperties: ['analyzer'],
    defaultProperties: {}
  },
  [ESFieldType.PERCOLATOR]: {
    label: 'Percolator',
    description: '感知器查询字段',
    supportedProperties: [],
    defaultProperties: {}
  },
  [ESFieldType.JOIN]: {
    label: 'Join',
    description: '父子关系字段',
    supportedProperties: ['relations'],
    defaultProperties: {}
  },
  [ESFieldType.RANK_FEATURE]: {
    label: 'Rank Feature',
    description: '排名特征字段',
    supportedProperties: ['positive_score_impact'],
    defaultProperties: {}
  },
  [ESFieldType.RANK_FEATURES]: {
    label: 'Rank Features',
    description: '多排名特征字段',
    supportedProperties: [],
    defaultProperties: {}
  },
  [ESFieldType.DENSE_VECTOR]: {
    label: 'Dense Vector',
    description: '密集向量字段',
    supportedProperties: ['dims', 'similarity', 'index'],
    defaultProperties: {}
  },
  [ESFieldType.SPARSE_VECTOR]: {
    label: 'Sparse Vector',
    description: '稀疏向量字段',
    supportedProperties: [],
    defaultProperties: {}
  },
  [ESFieldType.SEARCH_AS_YOU_TYPE]: {
    label: 'Search As You Type',
    description: '即时搜索字段',
    supportedProperties: ['analyzer', 'search_analyzer', 'max_shingle_size'],
    defaultProperties: {
      max_shingle_size: 3
    }
  },
  [ESFieldType.ALIAS]: {
    label: 'Alias',
    description: '字段别名',
    supportedProperties: ['path'],
    defaultProperties: {}
  },
  [ESFieldType.FLATTENED]: {
    label: 'Flattened',
    description: '扁平化对象字段',
    supportedProperties: ['depth_limit', 'ignore_above', 'null_value', 'split_queries_on_whitespace'],
    defaultProperties: {
      depth_limit: 20,
      ignore_above: 2048
    }
  },
  [ESFieldType.SHAPE]: {
    label: 'Shape',
    description: '任意笛卡尔几何形状字段',
    supportedProperties: ['orientation', 'ignore_malformed', 'ignore_z_value', 'coerce'],
    defaultProperties: {}
  },
  [ESFieldType.HISTOGRAM]: {
    label: 'Histogram',
    description: '直方图字段',
    supportedProperties: [],
    defaultProperties: {}
  },
  [ESFieldType.INTEGER_RANGE]: {
    label: 'Integer Range',
    description: '整数范围字段',
    supportedProperties: ['index', 'store', 'coerce'],
    defaultProperties: {
      index: true,
      coerce: true
    }
  },
  [ESFieldType.FLOAT_RANGE]: {
    label: 'Float Range',
    description: '浮点数范围字段',
    supportedProperties: ['index', 'store', 'coerce'],
    defaultProperties: {
      index: true,
      coerce: true
    }
  },
  [ESFieldType.LONG_RANGE]: {
    label: 'Long Range',
    description: '长整数范围字段',
    supportedProperties: ['index', 'store', 'coerce'],
    defaultProperties: {
      index: true,
      coerce: true
    }
  },
  [ESFieldType.DOUBLE_RANGE]: {
    label: 'Double Range',
    description: '双精度范围字段',
    supportedProperties: ['index', 'store', 'coerce'],
    defaultProperties: {
      index: true,
      coerce: true
    }
  },
  [ESFieldType.DATE_RANGE]: {
    label: 'Date Range',
    description: '日期范围字段',
    supportedProperties: ['index', 'store', 'format', 'coerce'],
    defaultProperties: {
      index: true,
      format: 'strict_date_optional_time||epoch_millis',
      coerce: true
    }
  }
}

// 获取字段类型的支持属性
export function getSupportedProperties(fieldType: ESFieldType): string[] {
  return fieldTypeConfigs[fieldType]?.supportedProperties || []
}

// 获取字段类型的默认属性
export function getDefaultProperties(fieldType: ESFieldType): Partial<MappingField> {
  return fieldTypeConfigs[fieldType]?.defaultProperties || {}
}

// 验证映射字段
export function validateMappingField(field: MappingField): string[] {
  const errors: string[] = []
  
  if (!field.name.trim()) {
    errors.push('字段名称不能为空')
  }
  
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
    errors.push('字段名称只能包含字母、数字和下划线，且不能以数字开头')
  }
  
  // 根据字段类型验证特定属性
  const supportedProperties = getSupportedProperties(field.type)
  
  if (field.type === ESFieldType.SCALED_FLOAT && !field.scaling_factor) {
    errors.push('scaled_float类型必须设置scaling_factor')
  }
  
  if (field.type === ESFieldType.ALIAS && !field.path) {
    errors.push('alias类型必须设置path属性')
  }
  
  return errors
}

// 常用分析器
export const commonAnalyzers = [
  { value: 'standard', label: 'Standard（标准）' },
  { value: 'simple', label: 'Simple（简单）' },
  { value: 'whitespace', label: 'Whitespace（空格）' },
  { value: 'keyword', label: 'Keyword（关键词）' },
  { value: 'pattern', label: 'Pattern（模式）' },
  { value: 'language', label: 'Language（语言）' },
  { value: 'fingerprint', label: 'Fingerprint（指纹）' },
  { value: 'ik_max_word', label: 'IK Max Word' },
  { value: 'ik_smart', label: 'IK Smart' }
]

// 常用日期格式
export const commonDateFormats = [
  { value: 'strict_date_optional_time||epoch_millis', label: 'ISO 8601 + 时间戳' },
  { value: 'yyyy-MM-dd HH:mm:ss', label: 'yyyy-MM-dd HH:mm:ss' },
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd' },
  { value: 'epoch_millis', label: '时间戳（毫秒）' },
  { value: 'epoch_second', label: '时间戳（秒）' }
]