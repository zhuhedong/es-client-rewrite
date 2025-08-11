use crate::types::*;
use crate::error::{ErrorDetails, parse_http_error};
use anyhow::{Context, Result};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use tracing::{debug, error};

#[derive(Clone)]
pub struct EsClient {
    client: Client,
    connection: EsConnection,
}

impl EsClient {
    pub fn new(connection: EsConnection) -> Self {
        let client_builder = Client::builder()
            .timeout(Duration::from_secs(30))
            .danger_accept_invalid_certs(true);

        let client = client_builder.build().unwrap();

        Self { client, connection }
    }

    pub async fn test_connection(&self) -> Result<Value> {
        let url = format!("{}/", self.connection.url);
        let mut response = self.make_request(&url).await?;
        
        // 尝试获取根路径信息，包含版本号
        if let Some(root_info) = response.as_object_mut() {
            // 获取集群健康状态
            if let Ok(health) = self.get_cluster_health().await {
                // 将健康状态信息合并到响应中
                if let Ok(health_value) = serde_json::to_value(health) {
                    if let Some(health_obj) = health_value.as_object() {
                        for (key, value) in health_obj {
                            root_info.insert(key.clone(), value.clone());
                        }
                    }
                }
            }
        }
        
        Ok(response)
    }

    pub async fn get_cluster_health(&self) -> Result<ClusterHealth> {
        let url = format!("{}/_cluster/health", self.connection.url);
        let response = self.make_request(&url).await?;
        
        let health: ClusterHealth = serde_json::from_value(response)
            .context("Failed to parse cluster health response")?;
        
        Ok(health)
    }

    pub async fn list_indices(&self) -> Result<Vec<IndexInfo>> {
        let url = format!("{}/_cat/indices?format=json&bytes=b", self.connection.url);
        let response = self.make_request(&url).await?;
        
        let indices_raw: Vec<Value> = serde_json::from_value(response)
            .context("Failed to parse indices response")?;
        
        let mut indices = Vec::new();
        for index_raw in indices_raw {
            let index = IndexInfo {
                name: index_raw.get("index").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                health: index_raw.get("health").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                status: index_raw.get("status").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                uuid: index_raw.get("uuid").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                primary_shards: index_raw.get("pri")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0),
                replica_shards: index_raw.get("rep")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0),
                docs_count: index_raw.get("docs.count")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok()),
                docs_deleted: index_raw.get("docs.deleted")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok()),
                store_size: index_raw.get("store.size")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            };
            indices.push(index);
        }
        
        Ok(indices)
    }

    pub async fn search(&self, query: SearchQuery) -> Result<SearchResult> {
        let url = format!("{}/{}/_search", self.connection.url, query.index);
        
        let mut search_body = serde_json::json!({
            "query": query.query
        });
        
        if let Some(from) = query.from {
            search_body["from"] = Value::from(from);
        }
        
        if let Some(size) = query.size {
            search_body["size"] = Value::from(size);
        }
        
        if let Some(sort) = query.sort {
            search_body["sort"] = Value::Array(sort);
        }
        
        let response = self.make_post_request(&url, &search_body).await?;
        
        let total = response.get("hits")
            .and_then(|h| h.get("total"))
            .and_then(|t| {
                if t.is_object() {
                    t.get("value").and_then(|v| v.as_u64())
                } else {
                    t.as_u64()
                }
            })
            .unwrap_or(0);
        
        let hits = response.get("hits")
            .and_then(|h| h.get("hits"))
            .and_then(|h| h.as_array())
            .unwrap_or(&vec![])
            .clone();
        
        let took = response.get("took").and_then(|t| t.as_u64()).unwrap_or(0);
        let timed_out = response.get("timed_out").and_then(|t| t.as_bool()).unwrap_or(false);
        
        // 获取聚合结果
        let aggregations = response.get("aggregations").cloned();
        
        Ok(SearchResult {
            total,
            hits,
            took,
            timed_out,
            aggregations,
        })
    }

    // 流式搜索方法，支持大数据集的内存优化
    pub async fn search_stream(&self, query: SearchQuery, batch_size: usize, max_results: Option<usize>) -> Result<Vec<Value>> {
        let mut all_hits = Vec::new();
        let mut current_from = query.from.unwrap_or(0) as usize;
        let page_size = std::cmp::min(batch_size, 10000); // ES 限制单次最多返回10000条
        let max_count = max_results.unwrap_or(usize::MAX);
        
        loop {
            if all_hits.len() >= max_count {
                break;
            }
            
            let remaining = max_count - all_hits.len();
            let current_size = std::cmp::min(page_size, remaining);
            
            let mut stream_query = query.clone();
            stream_query.from = Some(current_from as i32);
            stream_query.size = Some(current_size as i32);
            
            let result = self.search(stream_query).await?;
            
            if result.hits.is_empty() {
                break; // 没有更多数据
            }
            
            let batch_count = result.hits.len();
            all_hits.extend(result.hits);
            current_from += batch_count;
            
            // 如果本次返回的数据少于请求的数量，说明已经到了最后
            if batch_count < current_size {
                break;
            }
            
            // 防止无限循环
            if current_from >= result.total as usize {
                break;
            }
        }
        
        Ok(all_hits)
    }

    pub async fn get_mapping(&self, index: &str) -> Result<Value> {
        let url = format!("{}/{}/_mapping", self.connection.url, index);
        self.make_request(&url).await
    }

    // 提取索引字段名列表（用于自动补全）
    pub async fn get_field_names(&self, index: &str) -> Result<Vec<String>> {
        let mapping = self.get_mapping(index).await?;
        let mut field_names = Vec::new();
        
        if let Value::Object(indices) = &mapping {
            if let Some(index_obj) = indices.values().next() {
                if let Some(mappings) = index_obj.get("mappings") {
                    if let Some(properties) = mappings.get("properties") {
                        extract_field_names(properties, "", &mut field_names);
                    }
                }
            }
        }
        
        // 添加常用的元字段
        field_names.extend([
            "_id".to_string(),
            "_index".to_string(),
            "_type".to_string(),
            "_score".to_string(),
            "_source".to_string(),
            "@timestamp".to_string(),
        ]);
        
        // 去重并排序
        field_names.sort();
        field_names.dedup();
        
        Ok(field_names)
    }

    pub async fn create_index(&self, index: &str, mapping: Option<Value>) -> Result<Value> {
        let url = format!("{}/{}", self.connection.url, index);
        let body = mapping.unwrap_or_else(|| serde_json::json!({}));
        self.make_put_request(&url, &body).await
    }

    pub async fn delete_index(&self, index: &str) -> Result<Value> {
        let url = format!("{}/{}", self.connection.url, index);
        self.make_delete_request(&url).await
    }

    // 创建或更新文档
    pub async fn create_document(&self, request: &DocumentRequest) -> Result<DocumentResponse> {
        let url = if let Some(id) = &request.id {
            format!("{}/{}/_doc/{}", self.connection.url, request.index, id)
        } else {
            format!("{}/{}/_doc", self.connection.url, request.index)
        };
        
        let response = self.make_post_request(&url, &request.document).await?;
        
        Ok(DocumentResponse {
            index: response.get("_index").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            id: response.get("_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            version: response.get("_version").and_then(|v| v.as_u64()).unwrap_or(0),
            result: response.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }

    // 更新文档（使用 PUT）
    pub async fn update_document(&self, request: &DocumentRequest) -> Result<DocumentResponse> {
        let id = request.id.as_ref().ok_or_else(|| anyhow::anyhow!("Document ID is required for update"))?;
        let url = format!("{}/{}/_doc/{}", self.connection.url, request.index, id);
        
        let response = self.make_put_request(&url, &request.document).await?;
        
        Ok(DocumentResponse {
            index: response.get("_index").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            id: response.get("_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            version: response.get("_version").and_then(|v| v.as_u64()).unwrap_or(0),
            result: response.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }

    // 获取文档
    pub async fn get_document(&self, index: &str, id: &str) -> Result<GetDocumentResponse> {
        let url = format!("{}/{}/_doc/{}", self.connection.url, index, id);
        let response = self.make_request(&url).await?;
        
        Ok(GetDocumentResponse {
            index: response.get("_index").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            id: response.get("_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            version: response.get("_version").and_then(|v| v.as_u64()),
            found: response.get("found").and_then(|v| v.as_bool()).unwrap_or(false),
            source: response.get("_source").cloned(),
        })
    }

    // 删除文档
    pub async fn delete_document(&self, index: &str, id: &str) -> Result<DocumentResponse> {
        let url = format!("{}/{}/_doc/{}", self.connection.url, index, id);
        let response = self.make_delete_request(&url).await?;
        
        Ok(DocumentResponse {
            index: response.get("_index").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            id: response.get("_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            version: response.get("_version").and_then(|v| v.as_u64()).unwrap_or(0),
            result: response.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }

    // 批量操作
    pub async fn bulk_operations(&self, request: &BulkRequest) -> Result<BulkResponse> {
        let url = format!("{}/_bulk", self.connection.url);
        
        // 构建批量操作的请求体
        let mut bulk_body = String::new();
        for operation in &request.operations {
            // 操作描述行
            let action_line = match operation.action.as_str() {
                "index" => serde_json::json!({
                    "index": {
                        "_index": operation.index,
                        "_id": operation.id
                    }
                }),
                "create" => serde_json::json!({
                    "create": {
                        "_index": operation.index,
                        "_id": operation.id
                    }
                }),
                "update" => serde_json::json!({
                    "update": {
                        "_index": operation.index,
                        "_id": operation.id
                    }
                }),
                "delete" => serde_json::json!({
                    "delete": {
                        "_index": operation.index,
                        "_id": operation.id
                    }
                }),
                _ => return Err(anyhow::anyhow!("Unsupported bulk operation: {}", operation.action)),
            };
            
            bulk_body.push_str(&serde_json::to_string(&action_line)?);
            bulk_body.push('\n');
            
            // 如果有文档数据，添加文档行
            if let Some(document) = &operation.document {
                if operation.action != "delete" {
                    let doc_data = if operation.action == "update" {
                        // 更新操作需要包装在 doc 字段中
                        serde_json::json!({ "doc": document })
                    } else {
                        document.clone()
                    };
                    bulk_body.push_str(&serde_json::to_string(&doc_data)?);
                    bulk_body.push('\n');
                }
            }
        }
        
        let response = self.make_bulk_request(&url, &bulk_body).await?;
        
        Ok(BulkResponse {
            took: response.get("took").and_then(|v| v.as_u64()).unwrap_or(0),
            errors: response.get("errors").and_then(|v| v.as_bool()).unwrap_or(false),
            items: response.get("items")
                .and_then(|v| v.as_array())
                .unwrap_or(&vec![])
                .clone(),
        })
    }

    // 获取索引设置
    pub async fn get_index_settings(&self, index: &str) -> Result<Value> {
        let url = format!("{}/{}/_settings", self.connection.url, index);
        self.make_request(&url).await
    }

    // 更新索引设置
    pub async fn update_index_settings(&self, index: &str, settings: &IndexSettings) -> Result<Value> {
        let url = format!("{}/{}/_settings", self.connection.url, index);
        
        let mut settings_body = serde_json::json!({});
        let index_settings = &mut settings_body["index"];
        
        if let Some(replicas) = settings.number_of_replicas {
            index_settings["number_of_replicas"] = Value::from(replicas);
        }
        
        if let Some(refresh_interval) = &settings.refresh_interval {
            index_settings["refresh_interval"] = Value::from(refresh_interval.as_str());
        }
        
        if let Some(max_result_window) = settings.max_result_window {
            index_settings["max_result_window"] = Value::from(max_result_window);
        }
        
        if let Some(analysis) = &settings.analysis {
            index_settings["analysis"] = analysis.clone();
        }
        
        if let Some(other) = &settings.other_settings {
            // 合并其他设置
            if let Value::Object(other_map) = other {
                for (key, value) in other_map {
                    index_settings[key] = value.clone();
                }
            }
        }
        
        self.make_put_request(&url, &settings_body).await
    }

    // 获取所有别名
    pub async fn get_aliases(&self) -> Result<Value> {
        let url = format!("{}/_aliases", self.connection.url);
        self.make_request(&url).await
    }

    // 获取特定索引的别名
    pub async fn get_index_aliases(&self, index: &str) -> Result<Value> {
        let url = format!("{}/{}/_alias", self.connection.url, index);
        self.make_request(&url).await
    }

    // 管理别名（批量操作）
    pub async fn manage_aliases(&self, request: &AliasRequest) -> Result<Value> {
        let url = format!("{}/_aliases", self.connection.url);
        
        let mut actions = Vec::new();
        for action in &request.actions {
            let action_obj = if action.action == "add" {
                let mut add_obj = serde_json::json!({
                    "index": action.index,
                    "alias": action.alias
                });
                
                if let Some(filter) = &action.filter {
                    add_obj["filter"] = filter.clone();
                }
                
                if let Some(routing) = &action.routing {
                    add_obj["routing"] = Value::from(routing.as_str());
                }
                
                serde_json::json!({ "add": add_obj })
            } else {
                serde_json::json!({
                    "remove": {
                        "index": action.index,
                        "alias": action.alias
                    }
                })
            };
            
            actions.push(action_obj);
        }
        
        let body = serde_json::json!({ "actions": actions });
        self.make_post_request(&url, &body).await
    }

    // 添加单个别名
    pub async fn add_alias(&self, index: &str, alias: &str, filter: Option<&Value>, routing: Option<&str>) -> Result<Value> {
        let url = format!("{}/{}/_alias/{}", self.connection.url, index, alias);
        
        let mut body = serde_json::json!({});
        if let Some(filter_val) = filter {
            body["filter"] = filter_val.clone();
        }
        if let Some(routing_val) = routing {
            body["routing"] = Value::from(routing_val.as_str());
        }
        
        self.make_put_request(&url, &body).await
    }

    // 删除别名
    pub async fn remove_alias(&self, index: &str, alias: &str) -> Result<Value> {
        let url = format!("{}/{}/_alias/{}", self.connection.url, index, alias);
        self.make_delete_request(&url).await
    }

    // 获取所有索引模板
    pub async fn get_templates(&self) -> Result<Value> {
        let url = format!("{}/_template", self.connection.url);
        self.make_request(&url).await
    }

    // 获取特定模板
    pub async fn get_template(&self, name: &str) -> Result<Value> {
        let url = format!("{}/_template/{}", self.connection.url, name);
        self.make_request(&url).await
    }

    // 创建或更新模板
    pub async fn put_template(&self, request: &TemplateRequest) -> Result<Value> {
        let url = format!("{}/_template/{}", self.connection.url, request.name);
        
        let mut template_body = serde_json::json!({
            "index_patterns": request.template.index_patterns
        });
        
        if let Some(template) = &request.template.template {
            template_body["template"] = template.clone();
        }
        
        if let Some(settings) = &request.template.settings {
            template_body["settings"] = settings.clone();
        }
        
        if let Some(mappings) = &request.template.mappings {
            template_body["mappings"] = mappings.clone();
        }
        
        if let Some(aliases) = &request.template.aliases {
            template_body["aliases"] = aliases.clone();
        }
        
        if let Some(version) = request.template.version {
            template_body["version"] = Value::from(version);
        }
        
        if let Some(order) = request.template.order {
            template_body["order"] = Value::from(order);
        }
        
        self.make_put_request(&url, &template_body).await
    }

    // 删除模板
    pub async fn delete_template(&self, name: &str) -> Result<Value> {
        let url = format!("{}/_template/{}", self.connection.url, name);
        self.make_delete_request(&url).await
    }

    // 聚合查询
    pub async fn execute_aggregation(&self, request: &AggregationRequest) -> Result<AggregationResult> {
        let url = format!("{}{}{}_search", self.connection.url, 
            if request.index.starts_with('/') { "" } else { "/" }, 
            request.index);
        
        let mut search_body = serde_json::json!({
            "size": request.size.unwrap_or(0), // 通常聚合查询不需要返回文档
            "aggs": {}
        });
        
        // 添加查询条件
        if let Some(query) = &request.query {
            search_body["query"] = query.clone();
        }
        
        // 构建聚合
        let aggs = build_aggregations(&request.aggregations)?;
        search_body["aggs"] = aggs;
        
        debug!("Aggregation query: {}", serde_json::to_string_pretty(&search_body).unwrap_or_default());
        
        let response = self.make_post_request(&url, &search_body).await?;
        
        Ok(AggregationResult {
            took: response["took"].as_u64().unwrap_or(0),
            timed_out: response["timed_out"].as_bool().unwrap_or(false),
            hits: response["hits"].clone(),
            aggregations: response.get("aggregations").cloned(),
        })
    }

    // SQL 查询
    pub async fn execute_sql(&self, query: &SqlQuery) -> Result<SqlResult> {
        let url = format!("{}/_sql", self.connection.url);
        
        let mut request_body = serde_json::json!({
            "query": query.query
        });
        
        if let Some(fetch_size) = query.fetch_size {
            request_body["fetch_size"] = serde_json::Value::from(fetch_size);
        }
        
        if let Some(request_timeout) = &query.request_timeout {
            request_body["request_timeout"] = serde_json::Value::from(request_timeout.as_str());
        }
        
        if let Some(page_timeout) = &query.page_timeout {
            request_body["page_timeout"] = serde_json::Value::from(page_timeout.as_str());
        }
        
        debug!("SQL query request: {}", serde_json::to_string_pretty(&request_body).unwrap_or_default());
        
        let response = self.make_post_request(&url, &request_body).await?;
        
        let columns = response.get("columns")
            .and_then(|c| c.as_array())
            .map(|cols| {
                cols.iter()
                    .filter_map(|col| {
                        let name = col.get("name")?.as_str()?.to_string();
                        let type_str = col.get("type")?.as_str()?.to_string();
                        Some(SqlColumn { name, r#type: type_str })
                    })
                    .collect()
            })
            .unwrap_or_default();
            
        let rows = response.get("rows")
            .and_then(|r| r.as_array())
            .map(|rows_array| {
                rows_array.iter()
                    .filter_map(|row| row.as_array().cloned())
                    .collect()
            })
            .unwrap_or_default();
            
        let cursor = response.get("cursor")
            .and_then(|c| c.as_str())
            .map(|s| s.to_string());
        
        Ok(SqlResult {
            columns,
            rows,
            cursor,
        })
    }
    
    // SQL 游标查询 (用于分页)
    pub async fn execute_sql_cursor(&self, cursor: &str) -> Result<SqlResult> {
        let url = format!("{}/_sql", self.connection.url);
        
        let request_body = serde_json::json!({
            "cursor": cursor
        });
        
        let response = self.make_post_request(&url, &request_body).await?;
        
        let columns = response.get("columns")
            .and_then(|c| c.as_array())
            .map(|cols| {
                cols.iter()
                    .filter_map(|col| {
                        let name = col.get("name")?.as_str()?.to_string();
                        let type_str = col.get("type")?.as_str()?.to_string();
                        Some(SqlColumn { name, r#type: type_str })
                    })
                    .collect()
            })
            .unwrap_or_default();
            
        let rows = response.get("rows")
            .and_then(|r| r.as_array())
            .map(|rows_array| {
                rows_array.iter()
                    .filter_map(|row| row.as_array().cloned())
                    .collect()
            })
            .unwrap_or_default();
            
        let cursor = response.get("cursor")
            .and_then(|c| c.as_str())
            .map(|s| s.to_string());
        
        Ok(SqlResult {
            columns,
            rows,
            cursor,
        })
    }
    
    // 关闭 SQL 游标
    pub async fn close_sql_cursor(&self, cursor: &str) -> Result<()> {
        let url = format!("{}/_sql/close", self.connection.url);
        
        let request_body = serde_json::json!({
            "cursor": cursor
        });
        
        self.make_post_request(&url, &request_body).await?;
        Ok(())
    }

    // 获取节点信息
    pub async fn get_nodes_info(&self) -> Result<Vec<NodeInfo>> {
        let url = format!("{}/_nodes", self.connection.url);
        let response = self.make_request(&url).await?;
        
        let empty_map = serde_json::Map::new();
        let nodes = response
            .get("nodes")
            .and_then(|n| n.as_object())
            .unwrap_or(&empty_map);
            
        let mut node_list = Vec::new();
        
        for (node_id, node_data) in nodes {
            if let Ok(mut node_info) = serde_json::from_value::<NodeInfo>(node_data.clone()) {
                node_info.id = node_id.clone();
                node_list.push(node_info);
            }
        }
        
        Ok(node_list)
    }

    // 获取节点统计信息
    pub async fn get_nodes_stats(&self) -> Result<Vec<NodeStats>> {
        let url = format!("{}/_nodes/stats", self.connection.url);
        let response = self.make_request(&url).await?;
        
        let empty_map = serde_json::Map::new();
        let nodes = response
            .get("nodes")
            .and_then(|n| n.as_object())
            .unwrap_or(&empty_map);
            
        let mut stats_list = Vec::new();
        
        for (node_id, node_data) in nodes {
            if let Ok(mut node_stats) = serde_json::from_value::<NodeStats>(node_data.clone()) {
                node_stats.id = node_id.clone();
                stats_list.push(node_stats);
            }
        }
        
        Ok(stats_list)
    }

    // 获取特定节点信息
    pub async fn get_node_info(&self, node_id: &str) -> Result<NodeInfo> {
        let url = format!("{}/_nodes/{}", self.connection.url, node_id);
        let response = self.make_request(&url).await?;
        
        let nodes = response
            .get("nodes")
            .and_then(|n| n.as_object())
            .ok_or_else(|| anyhow::anyhow!("No nodes found in response"))?;
            
        let node_data = nodes
            .get(node_id)
            .ok_or_else(|| anyhow::anyhow!("Node {} not found", node_id))?;
            
        let mut node_info: NodeInfo = serde_json::from_value(node_data.clone())?;
        node_info.id = node_id.to_string();
        
        Ok(node_info)
    }

    // 获取特定节点统计信息
    pub async fn get_node_stats(&self, node_id: &str) -> Result<NodeStats> {
        let url = format!("{}/_nodes/{}/stats", self.connection.url, node_id);
        let response = self.make_request(&url).await?;
        
        let nodes = response
            .get("nodes")
            .and_then(|n| n.as_object())
            .ok_or_else(|| anyhow::anyhow!("No nodes found in response"))?;
            
        let node_data = nodes
            .get(node_id)
            .ok_or_else(|| anyhow::anyhow!("Node {} not found", node_id))?;
            
        let mut node_stats: NodeStats = serde_json::from_value(node_data.clone())?;
        node_stats.id = node_id.to_string();
        
        Ok(node_stats)
    }

    async fn make_request(&self, url: &str) -> Result<Value> {
        debug!("Making GET request to: {}", url);
        
        let mut request = self.client.get(url);
        
        if let Some(username) = &self.connection.username {
            if let Some(password) = &self.connection.password {
                request = request.basic_auth(username, Some(password));
            }
        }
        
        for (key, value) in &self.connection.headers {
            request = request.header(key, value);
        }
        
        let response = request.send().await
            .map_err(|e| {
                if e.is_timeout() {
                    ErrorDetails::timeout_error("GET请求", 30000)
                } else if e.is_connect() {
                    ErrorDetails::connection_failed(&self.connection.url, Some(e.to_string()))
                } else {
                    ErrorDetails::network_error(e.to_string())
                }
            })?;
        
        let status = response.status();
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            error!("Request failed with status {}: {}", status, text);
            return Err(parse_http_error(status.as_u16(), &text).into());
        }
        
        let json: Value = response.json().await
            .context("Failed to parse JSON response")?;
        
        Ok(json)
    }

    async fn make_post_request(&self, url: &str, body: &Value) -> Result<Value> {
        debug!("Making POST request to: {}", url);
        
        let mut request = self.client.post(url).json(body);
        
        if let Some(username) = &self.connection.username {
            if let Some(password) = &self.connection.password {
                request = request.basic_auth(username, Some(password));
            }
        }
        
        for (key, value) in &self.connection.headers {
            request = request.header(key, value);
        }
        
        let response = request.send().await
            .context("Failed to send POST request")?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            error!("POST request failed with status {}: {}", status, text);
            return Err(anyhow::anyhow!("HTTP {}: {}", status, text));
        }
        
        let json: Value = response.json().await
            .context("Failed to parse JSON response")?;
        
        Ok(json)
    }

    async fn make_put_request(&self, url: &str, body: &Value) -> Result<Value> {
        debug!("Making PUT request to: {}", url);
        
        let mut request = self.client.put(url).json(body);
        
        if let Some(username) = &self.connection.username {
            if let Some(password) = &self.connection.password {
                request = request.basic_auth(username, Some(password));
            }
        }
        
        for (key, value) in &self.connection.headers {
            request = request.header(key, value);
        }
        
        let response = request.send().await
            .context("Failed to send PUT request")?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            error!("PUT request failed with status {}: {}", status, text);
            return Err(anyhow::anyhow!("HTTP {}: {}", status, text));
        }
        
        let json: Value = response.json().await
            .context("Failed to parse JSON response")?;
        
        Ok(json)
    }

    async fn make_delete_request(&self, url: &str) -> Result<Value> {
        debug!("Making DELETE request to: {}", url);
        
        let mut request = self.client.delete(url);
        
        if let Some(username) = &self.connection.username {
            if let Some(password) = &self.connection.password {
                request = request.basic_auth(username, Some(password));
            }
        }
        
        for (key, value) in &self.connection.headers {
            request = request.header(key, value);
        }
        
        let response = request.send().await
            .context("Failed to send DELETE request")?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            error!("DELETE request failed with status {}: {}", status, text);
            return Err(anyhow::anyhow!("HTTP {}: {}", status, text));
        }
        
        let json: Value = response.json().await
            .unwrap_or_else(|_| serde_json::json!({"acknowledged": true}));
        
        Ok(json)
    }

    async fn make_bulk_request(&self, url: &str, body: &str) -> Result<Value> {
        debug!("Making BULK request to: {}", url);
        
        let mut request = self.client.post(url)
            .header("Content-Type", "application/x-ndjson")
            .body(body.to_string());
        
        if let Some(username) = &self.connection.username {
            if let Some(password) = &self.connection.password {
                request = request.basic_auth(username, Some(password));
            }
        }
        
        for (key, value) in &self.connection.headers {
            request = request.header(key, value);
        }
        
        let response = request.send().await
            .context("Failed to send BULK request")?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            error!("BULK request failed with status {}: {}", status, text);
            return Err(anyhow::anyhow!("HTTP {}: {}", status, text));
        }
        
        let json: Value = response.json().await
            .context("Failed to parse JSON response")?;
        
        Ok(json)
    }
}

// 构建聚合查询的辅助函数
fn build_aggregations(aggregations: &[AggregationConfig]) -> Result<Value> {
    let mut aggs_object = serde_json::Map::new();
    
    for agg in aggregations {
        let agg_definition = build_single_aggregation(agg)?;
        aggs_object.insert(agg.name.clone(), agg_definition);
    }
    
    Ok(Value::Object(aggs_object))
}

fn build_single_aggregation(agg: &AggregationConfig) -> Result<Value> {
    let mut agg_def = serde_json::Map::new();
    
    match agg.r#type.as_str() {
        "terms" => {
            let mut terms_agg = serde_json::json!({
                "field": agg.field
            });
            
            // 添加可选参数
            if let Some(params) = &agg.params {
                if let Some(size) = params.get("size") {
                    terms_agg["size"] = size.clone();
                }
                if let Some(order) = params.get("order") {
                    terms_agg["order"] = order.clone();
                }
                if let Some(min_doc_count) = params.get("min_doc_count") {
                    terms_agg["min_doc_count"] = min_doc_count.clone();
                }
            }
            
            agg_def.insert("terms".to_string(), terms_agg);
        },
        
        "date_histogram" => {
            let mut date_hist_agg = serde_json::json!({
                "field": agg.field
            });
            
            if let Some(params) = &agg.params {
                if let Some(calendar_interval) = params.get("calendar_interval") {
                    date_hist_agg["calendar_interval"] = calendar_interval.clone();
                } else if let Some(fixed_interval) = params.get("fixed_interval") {
                    date_hist_agg["fixed_interval"] = fixed_interval.clone();
                } else {
                    // 默认间隔
                    date_hist_agg["calendar_interval"] = Value::String("1d".to_string());
                }
                
                if let Some(time_zone) = params.get("time_zone") {
                    date_hist_agg["time_zone"] = time_zone.clone();
                }
                if let Some(min_doc_count) = params.get("min_doc_count") {
                    date_hist_agg["min_doc_count"] = min_doc_count.clone();
                }
            } else {
                date_hist_agg["calendar_interval"] = Value::String("1d".to_string());
            }
            
            agg_def.insert("date_histogram".to_string(), date_hist_agg);
        },
        
        "histogram" => {
            let mut hist_agg = serde_json::json!({
                "field": agg.field
            });
            
            if let Some(params) = &agg.params {
                if let Some(interval) = params.get("interval") {
                    hist_agg["interval"] = interval.clone();
                } else {
                    hist_agg["interval"] = Value::Number(serde_json::Number::from(1));
                }
                
                if let Some(min_doc_count) = params.get("min_doc_count") {
                    hist_agg["min_doc_count"] = min_doc_count.clone();
                }
            } else {
                hist_agg["interval"] = Value::Number(serde_json::Number::from(1));
            }
            
            agg_def.insert("histogram".to_string(), hist_agg);
        },
        
        "range" => {
            let mut range_agg = serde_json::json!({
                "field": agg.field
            });
            
            if let Some(params) = &agg.params {
                if let Some(ranges) = params.get("ranges") {
                    range_agg["ranges"] = ranges.clone();
                }
            }
            
            agg_def.insert("range".to_string(), range_agg);
        },
        
        // 度量聚合
        "avg" => {
            agg_def.insert("avg".to_string(), serde_json::json!({
                "field": agg.field
            }));
        },
        
        "sum" => {
            agg_def.insert("sum".to_string(), serde_json::json!({
                "field": agg.field
            }));
        },
        
        "max" => {
            agg_def.insert("max".to_string(), serde_json::json!({
                "field": agg.field
            }));
        },
        
        "min" => {
            agg_def.insert("min".to_string(), serde_json::json!({
                "field": agg.field
            }));
        },
        
        "count" => {
            agg_def.insert("value_count".to_string(), serde_json::json!({
                "field": agg.field
            }));
        },
        
        "cardinality" => {
            agg_def.insert("cardinality".to_string(), serde_json::json!({
                "field": agg.field
            }));
        },
        
        _ => {
            return Err(anyhow::anyhow!("Unsupported aggregation type: {}", agg.r#type));
        }
    }
    
    // 添加子聚合
    if let Some(sub_aggs) = &agg.sub_aggregations {
        if !sub_aggs.is_empty() {
            let sub_aggs_value = build_aggregations(sub_aggs)?;
            agg_def.insert("aggs".to_string(), sub_aggs_value);
        }
    }
    
    Ok(Value::Object(agg_def))
}

// 递归提取字段名的辅助函数
fn extract_field_names(properties: &Value, prefix: &str, field_names: &mut Vec<String>) {
    if let Value::Object(fields) = properties {
        for (field_name, field_def) in fields {
            let full_name = if prefix.is_empty() {
                field_name.clone()
            } else {
                format!("{}.{}", prefix, field_name)
            };
            
            field_names.push(full_name.clone());
            
            // 处理keyword类型的子字段
            if let Value::Object(field_obj) = field_def {
                if let Some(field_type) = field_obj.get("type") {
                    if field_type == "text" {
                        // text字段通常有keyword子字段
                        field_names.push(format!("{}.keyword", full_name));
                    }
                }
                
                // 递归处理嵌套字段
                if let Some(nested_properties) = field_obj.get("properties") {
                    extract_field_names(nested_properties, &full_name, field_names);
                }
                
                // 处理fields子字段（多字段映射）
                if let Some(fields) = field_obj.get("fields") {
                    extract_field_names(fields, &full_name, field_names);
                }
            }
        }
    }
}