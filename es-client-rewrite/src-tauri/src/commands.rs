use crate::es_client::EsClient;
use crate::types::*;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

pub struct ConnectionManager {
    connections: Mutex<HashMap<String, EsConnection>>,
    clients: Mutex<HashMap<String, EsClient>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
            clients: Mutex::new(HashMap::new()),
        }
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
        
        removed_conn && removed_client
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