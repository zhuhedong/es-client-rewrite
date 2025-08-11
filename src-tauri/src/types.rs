use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EsConnection {
    pub id: String,
    pub name: String,
    pub url: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub headers: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexInfo {
    pub name: String,
    pub health: String,
    pub status: String,
    pub uuid: String,
    pub primary_shards: u32,
    pub replica_shards: u32,
    pub docs_count: Option<u64>,
    pub docs_deleted: Option<u64>,
    pub store_size: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub index: String,
    pub query: serde_json::Value,
    pub from: Option<i32>,
    pub size: Option<i32>,
    pub sort: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlQuery {
    pub query: String,
    pub fetch_size: Option<u32>,
    pub request_timeout: Option<String>,
    pub page_timeout: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlResult {
    pub columns: Vec<SqlColumn>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlColumn {
    pub name: String,
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub total: u64,
    pub hits: Vec<serde_json::Value>,
    pub took: u64,
    pub timed_out: bool,
    pub aggregations: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterHealth {
    pub cluster_name: String,
    pub status: String,
    pub timed_out: bool,
    pub number_of_nodes: u32,
    pub number_of_data_nodes: u32,
    pub active_primary_shards: u32,
    pub active_shards: u32,
    pub relocating_shards: u32,
    pub initializing_shards: u32,
    pub unassigned_shards: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    pub id: String,
    pub name: String,
    pub transport_address: String,
    pub host: String,
    pub ip: String,
    pub version: String,
    pub build_flavor: String,
    pub build_type: String,
    pub build_hash: String,
    pub roles: Vec<String>,
    pub attributes: serde_json::Value,
    pub settings: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeStats {
    pub id: String,
    pub name: String,
    pub timestamp: u64,
    pub indices: NodeIndicesStats,
    pub os: NodeOsStats,
    pub process: NodeProcessStats,
    pub jvm: NodeJvmStats,
    pub thread_pool: serde_json::Value,
    pub fs: NodeFsStats,
    pub transport: NodeTransportStats,
    pub http: NodeHttpStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeIndicesStats {
    pub docs: NodeDocsStats,
    pub store: NodeStoreStats,
    pub indexing: NodeIndexingStats,
    pub search: NodeSearchStats,
    pub get: NodeGetStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeDocsStats {
    pub count: u64,
    pub deleted: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeStoreStats {
    pub size_in_bytes: u64,
    pub reserved_in_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeIndexingStats {
    pub index_total: u64,
    pub index_time_in_millis: u64,
    pub index_current: u64,
    pub delete_total: u64,
    pub delete_time_in_millis: u64,
    pub delete_current: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeSearchStats {
    pub query_total: u64,
    pub query_time_in_millis: u64,
    pub query_current: u64,
    pub fetch_total: u64,
    pub fetch_time_in_millis: u64,
    pub fetch_current: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeGetStats {
    pub total: u64,
    pub time_in_millis: u64,
    pub exists_total: u64,
    pub exists_time_in_millis: u64,
    pub missing_total: u64,
    pub missing_time_in_millis: u64,
    pub current: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeOsStats {
    pub timestamp: u64,
    pub cpu: NodeCpuStats,
    pub mem: NodeMemStats,
    pub swap: NodeSwapStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeCpuStats {
    pub percent: u32,
    pub load_average: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeMemStats {
    pub total_in_bytes: u64,
    pub free_in_bytes: u64,
    pub used_in_bytes: u64,
    pub free_percent: u32,
    pub used_percent: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeSwapStats {
    pub total_in_bytes: u64,
    pub free_in_bytes: u64,
    pub used_in_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeProcessStats {
    pub timestamp: u64,
    pub open_file_descriptors: u64,
    pub max_file_descriptors: u64,
    pub cpu: NodeProcessCpuStats,
    pub mem: NodeProcessMemStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeProcessCpuStats {
    pub percent: u32,
    pub total_in_millis: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeProcessMemStats {
    pub total_virtual_in_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeJvmStats {
    pub timestamp: u64,
    pub uptime_in_millis: u64,
    pub mem: NodeJvmMemStats,
    pub threads: NodeJvmThreadStats,
    pub gc: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeJvmMemStats {
    pub heap_used_in_bytes: u64,
    pub heap_used_percent: u32,
    pub heap_committed_in_bytes: u64,
    pub heap_max_in_bytes: u64,
    pub non_heap_used_in_bytes: u64,
    pub non_heap_committed_in_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeJvmThreadStats {
    pub count: u32,
    pub peak_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeFsStats {
    pub timestamp: u64,
    pub total: NodeFsTotalStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeFsTotalStats {
    pub total_in_bytes: u64,
    pub free_in_bytes: u64,
    pub available_in_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeTransportStats {
    pub server_open: u64,
    pub rx_count: u64,
    pub rx_size_in_bytes: u64,
    pub tx_count: u64,
    pub tx_size_in_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeHttpStats {
    pub current_open: u64,
    pub total_opened: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub query_id: String,
    pub connection_id: String,
    pub index: String,
    pub query: serde_json::Value,
    pub execution_time_ms: u64,
    pub timestamp: u64,
    pub result_count: u64,
    pub took_ms: u64,
    pub timed_out: bool,
    pub shards_total: u32,
    pub shards_successful: u32,
    pub shards_skipped: u32,
    pub shards_failed: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryPerformanceAnalysis {
    pub query_id: String,
    pub performance_score: f32, // 0-100
    pub recommendations: Vec<PerformanceRecommendation>,
    pub metrics: PerformanceMetrics,
    pub analysis_timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceRecommendation {
    pub category: String,
    pub severity: String, // low, medium, high, critical
    pub title: String,
    pub description: String,
    pub suggestion: String,
    pub impact_score: f32, // 0-10
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlowQueryLog {
    pub query_id: String,
    pub connection_id: String,
    pub index: String,
    pub query: serde_json::Value,
    pub execution_time_ms: u64,
    pub timestamp: u64,
    pub result_count: u64,
    pub threshold_ms: u64,
    pub node_id: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterPerformanceStats {
    pub timestamp: u64,
    pub total_queries: u64,
    pub avg_query_time_ms: f64,
    pub slow_queries_count: u64,
    pub failed_queries_count: u64,
    pub indexing_rate: f64,
    pub search_rate: f64,
    pub cpu_usage_percent: f32,
    pub memory_usage_percent: f32,
    pub disk_usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    JSON,
    CSV,
    Excel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRequest {
    pub connection_id: String,
    pub query: SearchQuery,
    pub format: ExportFormat,
    pub filename: String,
    pub selected_fields: Option<Vec<String>>,
    pub max_records: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub file_path: String,
    pub total_records: u64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentRequest {
    pub index: String,
    pub id: Option<String>,
    pub document: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentResponse {
    pub index: String,
    pub id: String,
    pub version: u64,
    pub result: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetDocumentResponse {
    pub index: String,
    pub id: String,
    pub version: Option<u64>,
    pub found: bool,
    pub source: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkOperation {
    pub action: String, // index, create, update, delete
    pub index: String,
    pub id: Option<String>,
    pub document: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkRequest {
    pub operations: Vec<BulkOperation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkResponse {
    pub took: u64,
    pub errors: bool,
    pub items: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexSettings {
    pub number_of_shards: Option<u32>,
    pub number_of_replicas: Option<u32>,
    pub refresh_interval: Option<String>,
    pub max_result_window: Option<u32>,
    pub analysis: Option<serde_json::Value>,
    pub other_settings: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexAlias {
    pub alias: String,
    pub index: String,
    pub filter: Option<serde_json::Value>,
    pub routing: Option<String>,
    pub search_routing: Option<String>,
    pub index_routing: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AliasAction {
    pub action: String, // add, remove
    pub alias: String,
    pub index: String,
    pub filter: Option<serde_json::Value>,
    pub routing: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AliasRequest {
    pub actions: Vec<AliasAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexTemplate {
    pub name: String,
    pub index_patterns: Vec<String>,
    pub template: Option<serde_json::Value>,
    pub settings: Option<serde_json::Value>,
    pub mappings: Option<serde_json::Value>,
    pub aliases: Option<serde_json::Value>,
    pub version: Option<u32>,
    pub order: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateRequest {
    pub name: String,
    pub template: IndexTemplate,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregationConfig {
    pub id: String,
    pub name: String,
    pub r#type: String, // "type" is a keyword in Rust, so we use raw identifier
    pub field: String,
    pub params: Option<serde_json::Value>,
    pub sub_aggregations: Option<Vec<AggregationConfig>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregationRequest {
    pub index: String,
    pub query: Option<serde_json::Value>,
    pub aggregations: Vec<AggregationConfig>,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregationResult {
    pub took: u64,
    pub timed_out: bool,
    pub hits: serde_json::Value,
    pub aggregations: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImportFormat {
    JSON,
    CSV,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportRequest {
    pub connection_id: String,
    pub index: String,
    pub file_path: String,
    pub format: ImportFormat,
    pub id_field: Option<String>,
    pub batch_size: Option<u32>,
    pub mapping: Option<serde_json::Value>,
    pub create_index: bool,
    pub overwrite_existing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub success: bool,
    pub total_processed: u64,
    pub successful_imports: u64,
    pub failed_imports: u64,
    pub errors: Vec<ImportError>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportError {
    pub line_number: u64,
    pub error_message: String,
    pub document: Option<serde_json::Value>,
}