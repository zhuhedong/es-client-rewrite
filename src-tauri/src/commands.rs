use crate::es_client::EsClient;
use crate::export::ExportService;
use crate::types::*;
use crate::crypto::{CryptoManager, SecureConnectionData};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;
use tauri::api::path::app_data_dir;
use tauri::State;
use uuid::Uuid;
use anyhow::Result;

pub struct ConnectionManager {
    connections: Mutex<HashMap<String, EsConnection>>,
    clients: Mutex<HashMap<String, EsClient>>,
    crypto: CryptoManager,
    config: tauri::Config,
}

impl ConnectionManager {
    pub fn new(config: tauri::Config) -> Result<Self, Box<dyn std::error::Error>> {
        let crypto = CryptoManager::new(&config)
            .map_err(|e| format!("Failed to initialize crypto manager: {}", e))?;
        
        let manager = Self {
            connections: Mutex::new(HashMap::new()),
            clients: Mutex::new(HashMap::new()),
            crypto,
            config,
        };
        
        // 启动时加载保存的连接
        if let Err(e) = manager.load_connections() {
            eprintln!("Failed to load connections: {}", e);
        }
        
        Ok(manager)
    }

    fn get_connections_file_path(&self) -> Result<PathBuf, Box<dyn std::error::Error>> {
        let app_data_dir = app_data_dir(&self.config)
            .ok_or("Failed to get app data directory")?;
        
        // 确保目录存在
        fs::create_dir_all(&app_data_dir)?;
        
        Ok(app_data_dir.join("connections.json"))
    }

    fn save_connections(&self) -> Result<(), Box<dyn std::error::Error>> {
        let connections = self.connections.lock().unwrap();
        let mut secure_connections = Vec::new();
        
        for connection in connections.values() {
            let encrypted_password = if let Some(password) = &connection.password {
                if !password.is_empty() {
                    Some(self.crypto.encrypt_password(password)
                        .map_err(|e| format!("Failed to encrypt password: {}", e))?)
                } else {
                    None
                }
            } else {
                None
            };
            
            let secure_connection = SecureConnectionData {
                id: connection.id.clone(),
                name: connection.name.clone(),
                url: connection.url.clone(),
                username: connection.username.clone(),
                encrypted_password,
                headers: connection.headers.clone(),
            };
            
            secure_connections.push(secure_connection);
        }
        
        let file_path = self.get_connections_file_path()?;
        let json_data = serde_json::to_string_pretty(&secure_connections)?;
        
        // 写入文件并设置权限
        fs::write(&file_path, json_data)?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&file_path)?.permissions();
            perms.set_mode(0o600); // rw-------
            fs::set_permissions(&file_path, perms)?;
        }
        
        Ok(())
    }

    fn load_connections(&self) -> Result<(), Box<dyn std::error::Error>> {
        let file_path = self.get_connections_file_path()?;
        
        if !file_path.exists() {
            return Ok(()); // 文件不存在是正常的，第一次运行时
        }
        
        let json_data = fs::read_to_string(&file_path)?;
        let secure_connections: Vec<SecureConnectionData> = serde_json::from_str(&json_data)?;
        
        let mut connections = self.connections.lock().unwrap();
        let mut clients = self.clients.lock().unwrap();
        
        for secure_conn in secure_connections {
            let password = if let Some(encrypted_password) = &secure_conn.encrypted_password {
                match self.crypto.decrypt_password(encrypted_password) {
                    Ok(pwd) => Some(pwd),
                    Err(e) => {
                        eprintln!("Failed to decrypt password for connection '{}': {}", secure_conn.name, e);
                        continue; // 跳过该连接
                    }
                }
            } else {
                None
            };
            
            let connection = EsConnection {
                id: secure_conn.id.clone(),
                name: secure_conn.name,
                url: secure_conn.url,
                username: secure_conn.username,
                password,
                headers: secure_conn.headers,
            };
            
            let client = EsClient::new(connection.clone());
            clients.insert(connection.id.clone(), client);
            connections.insert(connection.id.clone(), connection);
        }
        
        Ok(())
    }

    pub fn add_connection(&self, mut connection: EsConnection) -> String {
        if connection.id.is_empty() {
            connection.id = Uuid::new_v4().to_string();
        }

        let client = EsClient::new(connection.clone());
        
        let mut connections = self.connections.lock().unwrap();
        let mut clients = self.clients.lock().unwrap();
        
        connections.insert(connection.id.clone(), connection.clone());
        clients.insert(connection.id.clone(), client);
        
        // 保存到文件
        drop(connections);
        drop(clients);
        if let Err(e) = self.save_connections() {
            eprintln!("Failed to save connections: {}", e);
        }
        
        connection.id
    }

    pub fn get_connection(&self, id: &str) -> Option<EsConnection> {
        let connections = self.connections.lock().unwrap();
        connections.get(id).cloned()
    }

    pub fn get_client(&self, id: &str) -> Option<EsClient> {
        let clients = self.clients.lock().unwrap();
        clients.get(id).cloned()
    }

    pub fn list_connections(&self) -> Vec<EsConnection> {
        let connections = self.connections.lock().unwrap();
        connections.values().cloned().collect()
    }

    pub fn remove_connection(&self, id: &str) -> bool {
        let mut connections = self.connections.lock().unwrap();
        let mut clients = self.clients.lock().unwrap();
        
        let removed_conn = connections.remove(id).is_some();
        let removed_client = clients.remove(id).is_some();
        
        let success = removed_conn && removed_client;
        
        // 保存到文件
        if success {
            drop(connections);
            drop(clients);
            if let Err(e) = self.save_connections() {
                eprintln!("Failed to save connections after removal: {}", e);
            }
        }
        
        success
    }
}

#[tauri::command]
pub async fn add_connection(
    manager: State<'_, ConnectionManager>,
    connection: EsConnection,
) -> Result<String, String> {
    let id = manager.add_connection(connection);
    Ok(id)
}

#[tauri::command]
pub async fn list_connections(
    manager: State<'_, ConnectionManager>,
) -> Result<Vec<EsConnection>, String> {
    Ok(manager.list_connections())
}

#[tauri::command]
pub async fn remove_connection(
    manager: State<'_, ConnectionManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.remove_connection(&id))
}

#[tauri::command]
pub async fn test_connection(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
) -> Result<Value, String> {
    let client = manager
        .get_client(&connection_id)
        .ok_or("Connection not found")?;

    client
        .test_connection()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cluster_health(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
) -> Result<ClusterHealth, String> {
    let client = manager
        .get_client(&connection_id)
        .ok_or("Connection not found")?;

    client
        .get_cluster_health()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_indices(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
) -> Result<Vec<IndexInfo>, String> {
    let client = manager
        .get_client(&connection_id)
        .ok_or("Connection not found")?;

    client
        .list_indices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_documents(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
    query: SearchQuery,
) -> Result<SearchResult, String> {
    let client = manager
        .get_client(&connection_id)
        .ok_or("Connection not found")?;

    client
        .search(query)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_index_mapping(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
    index: String,
) -> Result<Value, String> {
    let client = manager
        .get_client(&connection_id)
        .ok_or("Connection not found")?;

    client
        .get_mapping(&index)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_index(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
    index: String,
    mapping: Option<Value>,
) -> Result<Value, String> {
    let client = manager
        .get_client(&connection_id)
        .ok_or("Connection not found")?;

    client
        .create_index(&index, mapping)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_index(
    manager: State<'_, ConnectionManager>,
    connection_id: String,
    index: String,
) -> Result<Value, String> {
    let client = manager
        .get_client(&connection_id)
        .ok_or("Connection not found")?;

    client
        .delete_index(&index)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_search_results(
    manager: State<'_, ConnectionManager>,
    request: ExportRequest,
) -> Result<ExportResult, String> {
    let client = manager
        .get_client(&request.connection_id)
        .ok_or("Connection not found")?;

    // 执行搜索获取所有数据
    let mut all_data = Vec::new();
    let batch_size = 1000;
    let max_records = request.max_records.unwrap_or(10000);
    let mut current_from = 0;

    while current_from < max_records {
        let remaining = max_records - current_from;
        let current_size = std::cmp::min(batch_size, remaining);

        let mut search_query = request.query.clone();
        search_query.from = Some(current_from);
        search_query.size = Some(current_size);

        match client.search(search_query).await {
            Ok(result) => {
                if result.hits.is_empty() {
                    break;
                }
                all_data.extend(result.hits);
                current_from += current_size;
                
                // 如果这批返回的数据少于请求的数量，说明已经没有更多数据了
                if result.hits.len() < current_size as usize {
                    break;
                }
            }
            Err(e) => return Err(format!("搜索失败: {}", e)),
        }
    }

    // 使用导出服务导出数据
    let export_service = ExportService::new();
    export_service
        .export_data(request, all_data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_export_directory() -> Result<String, String> {
    let export_service = ExportService::new();
    match export_service.get_export_directory() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(e.to_string()),
    }
}