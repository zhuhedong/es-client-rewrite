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

export interface SearchResult {
  total: number
  hits: any[]
  took: number
  timed_out: boolean
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