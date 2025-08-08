import { invoke } from '@tauri-apps/api/tauri'
import type { EsConnection, IndexInfo, SearchQuery, SearchResult, ClusterHealth, ExportRequest, ExportResult } from '../types'

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

  // 数据导出
  static async exportSearchResults(request: ExportRequest): Promise<ExportResult> {
    return await invoke('export_search_results', { request })
  }

  static async getExportDirectory(): Promise<string> {
    return await invoke('get_export_directory')
  }
}