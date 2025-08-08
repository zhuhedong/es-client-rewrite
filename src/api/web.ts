import type { EsConnection, IndexInfo, SearchQuery, SearchResult, ClusterHealth, ExportRequest, ExportResult } from '../types'

// Web版本的API实现 - 使用axios直接调用ES API
export class WebApi {
  // 连接管理（使用localStorage）
  static async addConnection(connection: EsConnection): Promise<string> {
    const connections = this.getStoredConnections()
    const id = Date.now().toString()
    connection.id = id
    connections.push(connection)
    localStorage.setItem('es-connections', JSON.stringify(connections))
    return id
  }

  static async listConnections(): Promise<EsConnection[]> {
    return this.getStoredConnections()
  }

  static async removeConnection(id: string): Promise<boolean> {
    const connections = this.getStoredConnections()
    const filtered = connections.filter(conn => conn.id !== id)
    localStorage.setItem('es-connections', JSON.stringify(filtered))
    return true
  }

  static async testConnection(connectionId: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    try {
      const response = await fetch(`${connection.url}/_cluster/health`, {
        method: 'GET',
        headers: this.getHeaders(connection)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      throw new Error(`连接测试失败: ${error}`)
    }
  }

  static async testTemporaryConnection(connection: EsConnection): Promise<any> {
    try {
      // 先获取根路径的版本信息
      const versionResponse = await fetch(`${connection.url}/`, {
        method: 'GET',
        headers: this.getHeaders(connection)
      })
      
      let versionInfo: any = {}
      if (versionResponse.ok) {
        versionInfo = await versionResponse.json()
      }
      
      // 然后获取集群健康状态
      const healthResponse = await fetch(`${connection.url}/_cluster/health`, {
        method: 'GET',
        headers: this.getHeaders(connection)
      })
      
      if (!healthResponse.ok) {
        throw new Error(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`)
      }
      
      const healthData = await healthResponse.json()
      
      // 合并版本信息和健康状态
      return {
        ...versionInfo,
        ...healthData
      }
    } catch (error) {
      throw new Error(`连接测试失败: ${error}`)
    }
  }

  // 集群信息
  static async getClusterHealth(connectionId: string): Promise<ClusterHealth> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/_cluster/health`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  // 索引管理
  static async listIndices(connectionId: string): Promise<IndexInfo[]> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/_cat/indices?format=json&bytes=b`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.map((item: any) => ({
      name: item.index || '',
      health: item.health || '',
      status: item.status || '',
      uuid: item.uuid || '',
      primary_shards: parseInt(item.pri) || 0,
      replica_shards: parseInt(item.rep) || 0,
      docs_count: parseInt(item['docs.count']) || 0,
      docs_deleted: parseInt(item['docs.deleted']) || 0,
      store_size: item['store.size'] || ''
    }))
  }

  static async getIndexMapping(connectionId: string, index: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/${index}/_mapping`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async createIndex(connectionId: string, index: string, mapping?: any): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/${index}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mapping || {})
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async deleteIndex(connectionId: string, index: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/${index}`, {
      method: 'DELETE',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  // 数据查询
  static async searchDocuments(connectionId: string, query: SearchQuery): Promise<SearchResult> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const searchBody: any = { query: query.query }
    if (query.from !== undefined) searchBody.from = query.from
    if (query.size !== undefined) searchBody.size = query.size
    if (query.sort) searchBody.sort = query.sort

    const response = await fetch(`${connection.url}/${query.index}/_search`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      total: data.hits?.total?.value || data.hits?.total || 0,
      hits: data.hits?.hits || [],
      took: data.took || 0,
      timed_out: data.timed_out || false
    }
  }

  // 数据导出 - Web版本暂不支持
  static async exportSearchResults(request: ExportRequest): Promise<ExportResult> {
    throw new Error('Web版本暂不支持数据导出功能，请使用桌面客户端')
  }

  static async getExportDirectory(): Promise<string> {
    throw new Error('Web版本暂不支持获取导出目录，请使用桌面客户端')
  }

  // 工具方法
  private static getStoredConnections(): EsConnection[] {
    const stored = localStorage.getItem('es-connections')
    return stored ? JSON.parse(stored) : []
  }

  private static getConnection(id: string): EsConnection | undefined {
    const connections = this.getStoredConnections()
    return connections.find(conn => conn.id === id)
  }

  private static getHeaders(connection: EsConnection): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...connection.headers
    }

    if (connection.username && connection.password) {
      const auth = btoa(`${connection.username}:${connection.password}`)
      headers['Authorization'] = `Basic ${auth}`
    }

    return headers
  }
}