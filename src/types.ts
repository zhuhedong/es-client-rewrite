export interface EsConnection {
  id: string
  name: string
  url: string
  username?: string
  password?: string
  headers: Record<string, string>
}

export interface IndexInfo {
  name: string
  health: string
  status: string
  uuid: string
  primary_shards: number
  replica_shards: number
  docs_count?: number
  docs_deleted?: number
  store_size?: string
}

export interface SearchQuery {
  index: string
  query: any
  from?: number
  size?: number
  sort?: any[]
}

export interface SqlQuery {
  query: string
  fetch_size?: number
  request_timeout?: string
  page_timeout?: string
}

export interface SqlColumn {
  name: string
  type: string
}

export interface SqlResult {
  columns: SqlColumn[]
  rows: any[][]
  cursor?: string
}

export interface SearchResult {
  total: number
  hits: any[]
  took: number
  timed_out: boolean
  aggregations?: any
}

export interface ClusterHealth {
  cluster_name: string
  status: string
  timed_out: boolean
  number_of_nodes: number
  number_of_data_nodes: number
  active_primary_shards: number
  active_shards: number
  relocating_shards: number
  initializing_shards: number
  unassigned_shards: number
}

export interface NodeInfo {
  id: string
  name: string
  transport_address: string
  host: string
  ip: string
  version: string
  build_flavor: string
  build_type: string
  build_hash: string
  roles: string[]
  attributes: any
  settings: any
}

export interface NodeStats {
  id: string
  name: string
  timestamp: number
  indices: NodeIndicesStats
  os: NodeOsStats
  process: NodeProcessStats
  jvm: NodeJvmStats
  thread_pool: any
  fs: NodeFsStats
  transport: NodeTransportStats
  http: NodeHttpStats
}

export interface NodeIndicesStats {
  docs: NodeDocsStats
  store: NodeStoreStats
  indexing: NodeIndexingStats
  search: NodeSearchStats
  get: NodeGetStats
}

export interface NodeDocsStats {
  count: number
  deleted: number
}

export interface NodeStoreStats {
  size_in_bytes: number
  reserved_in_bytes: number
}

export interface NodeIndexingStats {
  index_total: number
  index_time_in_millis: number
  index_current: number
  delete_total: number
  delete_time_in_millis: number
  delete_current: number
}

export interface NodeSearchStats {
  query_total: number
  query_time_in_millis: number
  query_current: number
  fetch_total: number
  fetch_time_in_millis: number
  fetch_current: number
}

export interface NodeGetStats {
  total: number
  time_in_millis: number
  exists_total: number
  exists_time_in_millis: number
  missing_total: number
  missing_time_in_millis: number
  current: number
}

export interface NodeOsStats {
  timestamp: number
  cpu: NodeCpuStats
  mem: NodeMemStats
  swap: NodeSwapStats
}

export interface NodeCpuStats {
  percent: number
  load_average?: any
}

export interface NodeMemStats {
  total_in_bytes: number
  free_in_bytes: number
  used_in_bytes: number
  free_percent: number
  used_percent: number
}

export interface NodeSwapStats {
  total_in_bytes: number
  free_in_bytes: number
  used_in_bytes: number
}

export interface NodeProcessStats {
  timestamp: number
  open_file_descriptors: number
  max_file_descriptors: number
  cpu: NodeProcessCpuStats
  mem: NodeProcessMemStats
}

export interface NodeProcessCpuStats {
  percent: number
  total_in_millis: number
}

export interface NodeProcessMemStats {
  total_virtual_in_bytes: number
}

export interface NodeJvmStats {
  timestamp: number
  uptime_in_millis: number
  mem: NodeJvmMemStats
  threads: NodeJvmThreadStats
  gc: any
}

export interface NodeJvmMemStats {
  heap_used_in_bytes: number
  heap_used_percent: number
  heap_committed_in_bytes: number
  heap_max_in_bytes: number
  non_heap_used_in_bytes: number
  non_heap_committed_in_bytes: number
}

export interface NodeJvmThreadStats {
  count: number
  peak_count: number
}

export interface NodeFsStats {
  timestamp: number
  total: NodeFsTotalStats
}

export interface NodeFsTotalStats {
  total_in_bytes: number
  free_in_bytes: number
  available_in_bytes: number
}

export interface NodeTransportStats {
  server_open: number
  rx_count: number
  rx_size_in_bytes: number
  tx_count: number
  tx_size_in_bytes: number
}

export interface NodeHttpStats {
  current_open: number
  total_opened: number
}

export enum ExportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  Excel = 'Excel'
}

export interface ExportRequest {
  connection_id: string
  query: SearchQuery
  format: ExportFormat
  filename: string
  selected_fields?: string[]
  max_records?: number
}

export interface ExportResult {
  success: boolean
  file_path: string
  total_records: number
  message: string
}

export interface DocumentRequest {
  index: string
  id?: string
  document: any
}

export interface DocumentResponse {
  index: string
  id: string
  version: number
  result: string
}

export interface GetDocumentResponse {
  index: string
  id: string
  version?: number
  found: boolean
  source?: any
}

export interface BulkOperation {
  action: string // index, create, update, delete
  index: string
  id?: string
  document?: any
}

export interface BulkRequest {
  operations: BulkOperation[]
}

export interface BulkResponse {
  took: number
  errors: boolean
  items: any[]
}

export interface IndexSettings {
  number_of_shards?: number
  number_of_replicas?: number
  refresh_interval?: string
  max_result_window?: number
  analysis?: any
  other_settings?: any
}

export interface IndexAlias {
  alias: string
  index: string
  filter?: any
  routing?: string
  search_routing?: string
  index_routing?: string
}

export interface AliasAction {
  action: string // add, remove
  alias: string
  index: string
  filter?: any
  routing?: string
}

export interface AliasRequest {
  actions: AliasAction[]
}

export interface IndexTemplate {
  name: string
  index_patterns: string[]
  template?: any
  settings?: any
  mappings?: any
  aliases?: any
  version?: number
  order?: number
}

export interface TemplateRequest {
  name: string
  template: IndexTemplate
}

// 查询构建器相关类型
export interface QueryCondition {
  id: string
  field: string
  operator: string
  value: any
  dataType: string // text, keyword, number, date, boolean
}

export interface QueryGroup {
  id: string
  operator: string // must, should, must_not, filter
  conditions: QueryCondition[]
  groups: QueryGroup[]
}

export interface QueryBuilderConfig {
  index: string
  groups: QueryGroup[]
  sort?: SortConfig[]
  from?: number
  size?: number
}

export interface SortConfig {
  field: string
  order: 'asc' | 'desc'
}

export interface FieldInfo {
  name: string
  type: string
  searchable: boolean
  aggregatable: boolean
}

export interface QueryBuilderState {
  config: QueryBuilderConfig
  generatedQuery: any
  isValid: boolean
  errors: string[]
}

// 聚合查询相关类型
export interface AggregationConfig {
  id: string
  name: string
  type: string // terms, date_histogram, histogram, range, avg, sum, count, max, min
  field: string
  params?: any // 聚合参数
  subAggregations?: AggregationConfig[]
}

export interface AggregationRequest {
  index: string
  query?: any
  aggregations: AggregationConfig[]
  size?: number
}

export interface AggregationResult {
  took: number
  timed_out: boolean
  hits: {
    total: number
    hits: any[]
  }
  aggregations: any
}

export interface ChartConfig {
  type: string // bar, line, pie, table
  title: string
  xField?: string
  yField?: string
  data: any[]
  options?: any
}

// 查询历史相关类型
export interface QueryHistory {
  id: string
  name: string
  type: string // search, aggregation, query_builder
  query: any
  index: string
  connectionId: string
  connectionName: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  description?: string
  favorite?: boolean
}

export interface QueryHistoryFilter {
  type?: string
  connectionId?: string
  tags?: string[]
  favorite?: boolean
  searchText?: string
}

export enum ImportFormat {
  JSON = 'JSON',
  CSV = 'CSV'
}

export interface ImportRequest {
  connection_id: string
  index: string
  file_path: string
  format: ImportFormat
  id_field?: string
  batch_size?: number
  mapping?: any
  create_index: boolean
  overwrite_existing: boolean
}

export interface ImportResult {
  success: boolean
  total_processed: number
  successful_imports: number
  failed_imports: number
  errors: ImportError[]
  message: string
}

export interface ImportError {
  line_number: number
  error_message: string
  document?: any
}

// 映射编辑器相关类型
export interface MappingField {
  name: string
  type: ESFieldType
  properties?: Record<string, MappingField>
  analyzer?: string
  index?: boolean
  store?: boolean
  doc_values?: boolean
  ignore_above?: number
  format?: string
  null_value?: any
  copy_to?: string[]
  fields?: Record<string, MappingField>
  boost?: number
  include_in_all?: boolean
  meta?: Record<string, any>
  scaling_factor?: number
  path?: string
  max_shingle_size?: number
  depth_limit?: number
  coerce?: boolean
}

export enum ESFieldType {
  TEXT = 'text',
  KEYWORD = 'keyword', 
  LONG = 'long',
  INTEGER = 'integer',
  SHORT = 'short',
  BYTE = 'byte',
  DOUBLE = 'double',
  FLOAT = 'float',
  HALF_FLOAT = 'half_float',
  SCALED_FLOAT = 'scaled_float',
  DATE = 'date',
  BOOLEAN = 'boolean',
  BINARY = 'binary',
  INTEGER_RANGE = 'integer_range',
  FLOAT_RANGE = 'float_range',
  LONG_RANGE = 'long_range',
  DOUBLE_RANGE = 'double_range',
  DATE_RANGE = 'date_range',
  OBJECT = 'object',
  NESTED = 'nested',
  IP = 'ip',
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  COMPLETION = 'completion',
  TOKEN_COUNT = 'token_count',
  MURMUR3 = 'murmur3',
  ANNOTATED_TEXT = 'annotated-text',
  PERCOLATOR = 'percolator',
  JOIN = 'join',
  RANK_FEATURE = 'rank_feature',
  RANK_FEATURES = 'rank_features',
  DENSE_VECTOR = 'dense_vector',
  SPARSE_VECTOR = 'sparse_vector',
  SEARCH_AS_YOU_TYPE = 'search_as_you_type',
  ALIAS = 'alias',
  FLATTENED = 'flattened',
  SHAPE = 'shape',
  HISTOGRAM = 'histogram'
}

export interface MappingEditorConfig {
  indexName?: string
  mappings: Record<string, MappingField>
  settings?: {
    number_of_shards?: number
    number_of_replicas?: number
    analysis?: any
  }
}

export interface FieldTypeConfig {
  type: ESFieldType
  label: string
  description: string
  supportedProperties: string[]
  defaultProperties?: Partial<MappingField>
}

export interface MappingValidationError {
  field: string
  property?: string
  message: string
  severity: 'error' | 'warning'
}