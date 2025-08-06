// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod es_client;
mod types;

use commands::*;
use tauri::Wry;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Create connection manager
    let connection_manager = ConnectionManager::new();

    tauri::Builder::<Wry>::new()
        .manage(connection_manager)
        .invoke_handler(tauri::generate_handler![
            add_connection,
            list_connections,
            remove_connection,
            test_connection,
            get_cluster_health,
            list_indices,
            search_documents,
            get_index_mapping,
            create_index,
            delete_index
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}