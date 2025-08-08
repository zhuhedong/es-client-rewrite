// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod es_client;
mod types;
mod crypto;
mod export;

use commands::*;
use tauri::Wry;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    let context = tauri::generate_context!();
    let config = context.config().clone();

    // Create connection manager with config for persistent storage
    let connection_manager = ConnectionManager::new(config)
        .expect("Failed to initialize connection manager");

    tauri::Builder::<Wry>::new()
        .manage(connection_manager)
        .invoke_handler(tauri::generate_handler![
            add_connection,
            list_connections,
            remove_connection,
            test_connection,
            test_temporary_connection,
            get_cluster_health,
            list_indices,
            search_documents,
            get_index_mapping,
            create_index,
            delete_index,
            export_search_results,
            get_export_directory
        ])
        .run(context)
        .expect("error while running tauri application");
}