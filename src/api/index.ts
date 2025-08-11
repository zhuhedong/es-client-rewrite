// 环境检测和API选择
import { TauriApi } from './tauri'
import { WebApi } from './web'

// 检测是否在Tauri环境中
const isTauriApp = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// 统一的API接口
export const Api = isTauriApp() ? TauriApi : WebApi

// 导出类型
export type { EsConnection, IndexInfo, SearchQuery, SearchResult, ClusterHealth, ExportRequest, ExportResult, ExportFormat, DocumentRequest, DocumentResponse, GetDocumentResponse, BulkOperation, BulkRequest, BulkResponse, IndexSettings, IndexAlias, AliasAction, AliasRequest, IndexTemplate, TemplateRequest, AggregationConfig, AggregationRequest, AggregationResult, ChartConfig, SqlQuery, SqlResult, SqlColumn, NodeInfo, NodeStats, ImportRequest, ImportResult, ImportFormat, ImportError } from '../types'