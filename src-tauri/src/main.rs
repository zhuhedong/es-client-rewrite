// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod es_client;
mod types;
mod crypto;
mod export;
mod import;
mod error;

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
            search_documents_stream,
            get_index_mapping,
            get_field_names,
            create_index,
            delete_index,
            export_search_results,
            get_export_directory,
            create_document,
            update_document,
            get_document,
            delete_document,
            bulk_operations,
            get_index_settings,
            update_index_settings,
            get_aliases,
            get_index_aliases,
            manage_aliases,
            add_alias,
            remove_alias,
            get_templates,
            get_template,
            put_template,
            delete_template,
            execute_aggregation,
            execute_sql,
            execute_sql_cursor,
            close_sql_cursor,
            get_nodes_info,
            get_nodes_stats,
            get_node_info,
            get_node_stats,
            import_data
        ])
        .run(context)
        .expect("error while running tauri application");
}