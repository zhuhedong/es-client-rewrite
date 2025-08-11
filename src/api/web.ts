import type { EsConnection, IndexInfo, SearchQuery, SearchResult, ClusterHealth, ExportRequest, ExportResult, DocumentRequest, DocumentResponse, GetDocumentResponse, BulkRequest, BulkResponse, IndexSettings, AliasRequest, TemplateRequest, AggregationRequest, AggregationResult, SqlQuery, SqlResult, NodeInfo, NodeStats, ImportRequest, ImportResult } from '../types'

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
      throw new Error(`获取索引映射失败: ${response.statusText}`)
    }

    return await response.json()
  }

  static async getFieldNames(connectionId: string, index: string): Promise<string[]> {
    // For web version, we extract field names from mapping on the frontend
    const mapping = await this.getIndexMapping(connectionId, index)
    const fieldNames: string[] = []
    
    const extractFields = (properties: any, prefix = '') => {
      if (!properties || typeof properties !== 'object') return
      
      for (const [fieldName, fieldDef] of Object.entries(properties)) {
        const fullName = prefix ? `${prefix}.${fieldName}` : fieldName
        fieldNames.push(fullName)
        
        if (typeof fieldDef === 'object' && fieldDef !== null) {
          const def = fieldDef as any
          
          // Add keyword subfield for text fields
          if (def.type === 'text') {
            fieldNames.push(`${fullName}.keyword`)
          }
          
          // Recurse into nested properties
          if (def.properties) {
            extractFields(def.properties, fullName)
          }
          
          // Handle multi-fields
          if (def.fields) {
            extractFields(def.fields, fullName)
          }
        }
      }
    }
    
    // Extract from mapping
    Object.values(mapping).forEach((indexMapping: any) => {
      if (indexMapping?.mappings?.properties) {
        extractFields(indexMapping.mappings.properties)
      }
    })
    
    // Add common meta fields
    fieldNames.push('_id', '_index', '_type', '_score', '_source', '@timestamp')
    
    // Sort and dedupe
    return [...new Set(fieldNames)].sort()
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
      timed_out: data.timed_out || false,
      aggregations: data.aggregations
    }
  }

  // 流式查询（Web版本使用分页实现）
  static async searchDocumentsStream(
    connectionId: string, 
    query: SearchQuery, 
    batchSize: number = 1000, 
    maxResults?: number
  ): Promise<any[]> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const allHits: any[] = []
    let currentFrom = query.from || 0
    const pageSize = Math.min(batchSize, 10000) // ES 限制
    const maxCount = maxResults || 50000 // 默认最多5万条

    while (allHits.length < maxCount) {
      const remaining = maxCount - allHits.length
      const currentSize = Math.min(pageSize, remaining)

      const searchBody: any = { 
        query: query.query,
        from: currentFrom,
        size: currentSize
      }
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
      const hits = data.hits?.hits || []

      if (hits.length === 0) {
        break // 没有更多数据
      }

      allHits.push(...hits)
      currentFrom += hits.length

      // 如果这批数据少于请求的数量，说明已经到了最后
      if (hits.length < currentSize) {
        break
      }
    }

    return allHits
  }

  // 数据导出 - Web版本暂不支持
  static async exportSearchResults(request: ExportRequest): Promise<ExportResult> {
    throw new Error('Web版本暂不支持数据导出功能，请使用桌面客户端')
  }

  static async getExportDirectory(): Promise<string> {
    throw new Error('Web版本暂不支持获取导出目录，请使用桌面客户端')
  }

  // 文档操作
  static async createDocument(connectionId: string, request: DocumentRequest): Promise<DocumentResponse> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const url = request.id 
      ? `${connection.url}/${request.index}/_doc/${request.id}`
      : `${connection.url}/${request.index}/_doc`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request.document)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      index: data._index || '',
      id: data._id || '',
      version: data._version || 0,
      result: data.result || ''
    }
  }

  static async updateDocument(connectionId: string, request: DocumentRequest): Promise<DocumentResponse> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')
    if (!request.id) throw new Error('更新文档需要提供文档ID')

    const url = `${connection.url}/${request.index}/_doc/${request.id}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request.document)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      index: data._index || '',
      id: data._id || '',
      version: data._version || 0,
      result: data.result || ''
    }
  }

  static async getDocument(connectionId: string, index: string, id: string): Promise<GetDocumentResponse> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/${index}/_doc/${id}`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      index: data._index || '',
      id: data._id || '',
      version: data._version,
      found: data.found || false,
      source: data._source
    }
  }

  static async deleteDocument(connectionId: string, index: string, id: string): Promise<DocumentResponse> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/${index}/_doc/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      index: data._index || '',
      id: data._id || '',
      version: data._version || 0,
      result: data.result || ''
    }
  }

  // 批量操作
  static async bulkOperations(connectionId: string, request: BulkRequest): Promise<BulkResponse> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    // 构建批量操作的请求体
    let bulkBody = ''
    for (const operation of request.operations) {
      // 操作描述行
      const actionLine = {
        [operation.action]: {
          _index: operation.index,
          _id: operation.id
        }
      }
      
      bulkBody += JSON.stringify(actionLine) + '\n'
      
      // 如果有文档数据，添加文档行
      if (operation.document && operation.action !== 'delete') {
        const docData = operation.action === 'update' 
          ? { doc: operation.document }
          : operation.document
        bulkBody += JSON.stringify(docData) + '\n'
      }
    }

    const response = await fetch(`${connection.url}/_bulk`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/x-ndjson'
      },
      body: bulkBody
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      took: data.took || 0,
      errors: data.errors || false,
      items: data.items || []
    }
  }

  // 索引设置管理
  static async getIndexSettings(connectionId: string, index: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/${index}/_settings`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async updateIndexSettings(connectionId: string, index: string, settings: IndexSettings): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const settingsBody: any = { index: {} }
    
    if (settings.number_of_replicas !== undefined) {
      settingsBody.index.number_of_replicas = settings.number_of_replicas
    }
    
    if (settings.refresh_interval) {
      settingsBody.index.refresh_interval = settings.refresh_interval
    }
    
    if (settings.max_result_window !== undefined) {
      settingsBody.index.max_result_window = settings.max_result_window
    }
    
    if (settings.analysis) {
      settingsBody.index.analysis = settings.analysis
    }
    
    if (settings.other_settings && typeof settings.other_settings === 'object') {
      Object.assign(settingsBody.index, settings.other_settings)
    }

    const response = await fetch(`${connection.url}/${index}/_settings`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settingsBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  // 别名管理
  static async getAliases(connectionId: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/_aliases`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async getIndexAliases(connectionId: string, index: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/${index}/_alias`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async manageAliases(connectionId: string, request: AliasRequest): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const actions = request.actions.map(action => {
      if (action.action === 'add') {
        const addObj: any = {
          index: action.index,
          alias: action.alias
        }
        
        if (action.filter) {
          addObj.filter = action.filter
        }
        
        if (action.routing) {
          addObj.routing = action.routing
        }
        
        return { add: addObj }
      } else {
        return {
          remove: {
            index: action.index,
            alias: action.alias
          }
        }
      }
    })

    const body = { actions }

    const response = await fetch(`${connection.url}/_aliases`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async addAlias(connectionId: string, index: string, alias: string, filter?: any, routing?: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const body: any = {}
    if (filter) body.filter = filter
    if (routing) body.routing = routing

    const response = await fetch(`${connection.url}/${index}/_alias/${alias}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async removeAlias(connectionId: string, index: string, alias: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/${index}/_alias/${alias}`, {
      method: 'DELETE',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  // 模板管理
  static async getTemplates(connectionId: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/_template`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async getTemplate(connectionId: string, name: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/_template/${name}`, {
      method: 'GET',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async putTemplate(connectionId: string, request: TemplateRequest): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const templateBody: any = {
      index_patterns: request.template.index_patterns
    }
    
    if (request.template.template) {
      templateBody.template = request.template.template
    }
    
    if (request.template.settings) {
      templateBody.settings = request.template.settings
    }
    
    if (request.template.mappings) {
      templateBody.mappings = request.template.mappings
    }
    
    if (request.template.aliases) {
      templateBody.aliases = request.template.aliases
    }
    
    if (request.template.version !== undefined) {
      templateBody.version = request.template.version
    }
    
    if (request.template.order !== undefined) {
      templateBody.order = request.template.order
    }

    const response = await fetch(`${connection.url}/_template/${request.name}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(connection),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templateBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  static async deleteTemplate(connectionId: string, name: string): Promise<any> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    const response = await fetch(`${connection.url}/_template/${name}`, {
      method: 'DELETE',
      headers: this.getHeaders(connection)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  // 聚合查询
  static async executeAggregation(connectionId: string, request: AggregationRequest): Promise<AggregationResult> {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error('连接不存在')

    // 构建聚合查询体
    const searchBody: any = {
      size: request.size || 0,
      aggs: this.buildAggregations(request.aggregations)
    }

    if (request.query) {
      searchBody.query = request.query
    }

    const response = await fetch(`${connection.url}/${request.index}/_search`, {
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
      took: data.took || 0,
      timed_out: data.timed_out || false,
      hits: data.hits,
      aggregations: data.aggregations
    }
  }

  // SQL 查询 - Web版本暂不支持
  static async executeSql(connectionId: string, query: SqlQuery): Promise<SqlResult> {
    throw new Error('Web版本暂不支持SQL查询功能，请使用桌面客户端')
  }

  static async executeSqlCursor(connectionId: string, cursor: string): Promise<SqlResult> {
    throw new Error('Web版本暂不支持SQL游标查询功能，请使用桌面客户端')
  }

  static async closeSqlCursor(connectionId: string, cursor: string): Promise<void> {
    throw new Error('Web版本暂不支持关闭SQL游标功能，请使用桌面客户端')
  }

  // 节点监控 - Web版本暂不支持  
  static async getNodesInfo(connectionId: string): Promise<NodeInfo[]> {
    throw new Error('Web版本暂不支持节点信息获取功能，请使用桌面客户端')
  }

  static async getNodesStats(connectionId: string): Promise<NodeStats[]> {
    throw new Error('Web版本暂不支持节点统计获取功能，请使用桌面客户端')
  }

  static async getNodeInfo(connectionId: string, nodeId: string): Promise<NodeInfo> {
    throw new Error('Web版本暂不支持单节点信息获取功能，请使用桌面客户端')
  }

  static async getNodeStats(connectionId: string, nodeId: string): Promise<NodeStats> {
    throw new Error('Web版本暂不支持单节点统计获取功能，请使用桌面客户端')
  }

  // 构建聚合查询的辅助方法
  private static buildAggregations(aggregations: any[]): any {
    const aggs: any = {}
    
    for (const agg of aggregations) {
      aggs[agg.name] = this.buildSingleAggregation(agg)
    }
    
    return aggs
  }

  private static buildSingleAggregation(agg: any): any {
    const aggDef: any = {}
    
    switch (agg.type) {
      case 'terms':
        aggDef.terms = {
          field: agg.field,
          ...(agg.params || {})
        }
        break
        
      case 'date_histogram':
        aggDef.date_histogram = {
          field: agg.field,
          calendar_interval: agg.params?.calendar_interval || '1d',
          ...(agg.params || {})
        }
        break
        
      case 'histogram':
        aggDef.histogram = {
          field: agg.field,
          interval: agg.params?.interval || 1,
          ...(agg.params || {})
        }
        break
        
      case 'range':
        aggDef.range = {
          field: agg.field,
          ...(agg.params || {})
        }
        break
        
      case 'avg':
        aggDef.avg = { field: agg.field }
        break
        
      case 'sum':
        aggDef.sum = { field: agg.field }
        break
        
      case 'max':
        aggDef.max = { field: agg.field }
        break
        
      case 'min':
        aggDef.min = { field: agg.field }
        break
        
      case 'count':
        aggDef.value_count = { field: agg.field }
        break
        
      case 'cardinality':
        aggDef.cardinality = { field: agg.field }
        break
        
      default:
        throw new Error(`不支持的聚合类型: ${agg.type}`)
    }
    
    // 添加子聚合
    if (agg.subAggregations && agg.subAggregations.length > 0) {
      aggDef.aggs = this.buildAggregations(agg.subAggregations)
    }
    
    return aggDef
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

  // 数据导入（Web环境不支持文件系统访问）
  static async importData(request: ImportRequest): Promise<ImportResult> {
    throw new Error('数据导入功能仅在桌面版本中可用')
  }
}