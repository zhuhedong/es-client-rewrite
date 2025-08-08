use crate::types::*;
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
        if let Ok(root_info) = response.as_object_mut() {
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
        
        Ok(SearchResult {
            total,
            hits,
            took,
            timed_out,
        })
    }

    pub async fn get_mapping(&self, index: &str) -> Result<Value> {
        let url = format!("{}/{}/_mapping", self.connection.url, index);
        self.make_request(&url).await
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
            .context("Failed to send request")?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            error!("Request failed with status {}: {}", status, text);
            return Err(anyhow::anyhow!("HTTP {}: {}", status, text));
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
}