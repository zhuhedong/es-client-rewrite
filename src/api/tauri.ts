import { invoke } from '@tauri-apps/api/tauri'
import type { EsConnection, IndexInfo, SearchQuery, SearchResult, ClusterHealth, ExportRequest, ExportResult, DocumentRequest, DocumentResponse, GetDocumentResponse, BulkRequest, BulkResponse, IndexSettings, AliasRequest, TemplateRequest, AggregationRequest, AggregationResult, SqlQuery, SqlResult, NodeInfo, NodeStats, ImportRequest, ImportResult } from '../types'

export class TauriApi {
  // 连接管理
  static async addConnection(connection: EsConnection): Promise<string> {
    return await invoke('add_connection', { connection })
  }

  static async listConnections(): Promise<EsConnection[]> {
    return await invoke('list_connections')
  }

  static async removeConnection(id: string): Promise<boolean> {
    return await invoke('remove_connection', { id })
  }

  static async testConnection(connectionId: string): Promise<any> {
    return await invoke('test_connection', { connectionId })
  }

  static async testTemporaryConnection(connection: EsConnection): Promise<any> {
    return await invoke('test_temporary_connection', { connection })
  }

  // 集群信息
  static async getClusterHealth(connectionId: string): Promise<ClusterHealth> {
    return await invoke('get_cluster_health', { connectionId })
  }

  // 索引管理
  static async listIndices(connectionId: string): Promise<IndexInfo[]> {
    return await invoke('list_indices', { connectionId })
  }

  static async getIndexMapping(connectionId: string, index: string): Promise<any> {
    return await invoke('get_index_mapping', { connectionId, index })
  }

  static async getFieldNames(connectionId: string, index: string): Promise<string[]> {
    return await invoke('get_field_names', { connectionId, index })
  }

  static async createIndex(connectionId: string, index: string, mapping?: any): Promise<any> {
    return await invoke('create_index', { connectionId, index, mapping })
  }

  static async deleteIndex(connectionId: string, index: string): Promise<any> {
    return await invoke('delete_index', { connectionId, index })
  }

  // 数据查询
  static async searchDocuments(connectionId: string, query: SearchQuery): Promise<SearchResult> {
    return await invoke('search_documents', { connectionId, query })
  }

  // 流式查询（大数据集优化）
  static async searchDocumentsStream(
    connectionId: string, 
    query: SearchQuery, 
    batchSize?: number, 
    maxResults?: number
  ): Promise<any[]> {
    return await invoke('search_documents_stream', { 
      connectionId, 
      query, 
      batchSize, 
      maxResults 
    })
  }

  // 数据导出
  static async exportSearchResults(request: ExportRequest): Promise<ExportResult> {
    return await invoke('export_search_results', { request })
  }

  static async getExportDirectory(): Promise<string> {
    return await invoke('get_export_directory')
  }

  // 文档操作
  static async createDocument(connectionId: string, request: DocumentRequest): Promise<DocumentResponse> {
    return await invoke('create_document', { connectionId, request })
  }

  static async updateDocument(connectionId: string, request: DocumentRequest): Promise<DocumentResponse> {
    return await invoke('update_document', { connectionId, request })
  }

  static async getDocument(connectionId: string, index: string, id: string): Promise<GetDocumentResponse> {
    return await invoke('get_document', { connectionId, index, id })
  }

  static async deleteDocument(connectionId: string, index: string, id: string): Promise<DocumentResponse> {
    return await invoke('delete_document', { connectionId, index, id })
  }

  // 批量操作
  static async bulkOperations(connectionId: string, request: BulkRequest): Promise<BulkResponse> {
    return await invoke('bulk_operations', { connectionId, request })
  }

  // 索引设置管理
  static async getIndexSettings(connectionId: string, index: string): Promise<any> {
    return await invoke('get_index_settings', { connectionId, index })
  }

  static async updateIndexSettings(connectionId: string, index: string, settings: IndexSettings): Promise<any> {
    return await invoke('update_index_settings', { connectionId, index, settings })
  }

  // 别名管理
  static async getAliases(connectionId: string): Promise<any> {
    return await invoke('get_aliases', { connectionId })
  }

  static async getIndexAliases(connectionId: string, index: string): Promise<any> {
    return await invoke('get_index_aliases', { connectionId, index })
  }

  static async manageAliases(connectionId: string, request: AliasRequest): Promise<any> {
    return await invoke('manage_aliases', { connectionId, request })
  }

  static async addAlias(connectionId: string, index: string, alias: string, filter?: any, routing?: string): Promise<any> {
    return await invoke('add_alias', { connectionId, index, alias, filter, routing })
  }

  static async removeAlias(connectionId: string, index: string, alias: string): Promise<any> {
    return await invoke('remove_alias', { connectionId, index, alias })
  }

  // 模板管理
  static async getTemplates(connectionId: string): Promise<any> {
    return await invoke('get_templates', { connectionId })
  }

  static async getTemplate(connectionId: string, name: string): Promise<any> {
    return await invoke('get_template', { connectionId, name })
  }

  static async putTemplate(connectionId: string, request: TemplateRequest): Promise<any> {
    return await invoke('put_template', { connectionId, request })
  }

  static async deleteTemplate(connectionId: string, name: string): Promise<any> {
    return await invoke('delete_template', { connectionId, name })
  }

  // 聚合查询
  static async executeAggregation(connectionId: string, request: AggregationRequest): Promise<AggregationResult> {
    return await invoke('execute_aggregation', { connectionId, request })
  }

  // SQL 查询
  static async executeSql(connectionId: string, query: SqlQuery): Promise<SqlResult> {
    return await invoke('execute_sql', { connectionId, query })
  }

  static async executeSqlCursor(connectionId: string, cursor: string): Promise<SqlResult> {
    return await invoke('execute_sql_cursor', { connectionId, cursor })
  }

  static async closeSqlCursor(connectionId: string, cursor: string): Promise<void> {
    return await invoke('close_sql_cursor', { connectionId, cursor })
  }

  // 节点监控
  static async getNodesInfo(connectionId: string): Promise<NodeInfo[]> {
    return await invoke('get_nodes_info', { connectionId })
  }

  static async getNodesStats(connectionId: string): Promise<NodeStats[]> {
    return await invoke('get_nodes_stats', { connectionId })
  }

  static async getNodeInfo(connectionId: string, nodeId: string): Promise<NodeInfo> {
    return await invoke('get_node_info', { connectionId, nodeId })
  }

  static async getNodeStats(connectionId: string, nodeId: string): Promise<NodeStats> {
    return await invoke('get_node_stats', { connectionId, nodeId })
  }

  // 数据导入
  static async importData(request: ImportRequest): Promise<ImportResult> {
    return await invoke('import_data', { request })
  }
}