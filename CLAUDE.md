# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
# Start development mode (runs both frontend dev server and Tauri)
npm run tauri:dev

# Frontend development only
npm run dev

# Type checking
vue-tsc --noEmit

# Build frontend
npm run build
```

### Build & Release
```bash
# Build release version (creates platform-specific installers)
npm run tauri:build

# Preview built frontend
npm run preview
```

### Rust Backend
```bash
# From src-tauri/ directory
cargo build                    # Development build
cargo build --release         # Release build
cargo test                     # Run tests
cargo clippy                   # Linting
```

## Architecture

This is a **Tauri-based Elasticsearch client** with Rust backend and Vue 3 frontend, replacing an Electron-based version.

### Backend Architecture (Rust + Tauri)
- **Entry Point**: `src-tauri/src/main.rs` - Initializes Tauri app with command handlers
- **Connection Management**: `src-tauri/src/commands.rs` - Manages ES connections via `ConnectionManager`
- **HTTP Client**: `src-tauri/src/es_client.rs` - `EsClient` handles all Elasticsearch API calls
- **Data Types**: `src-tauri/src/types.rs` - Shared type definitions for serialization

Key patterns:
- Uses `ConnectionManager` to maintain HashMap of connections and HTTP clients
- All Tauri commands are async and return `Result<T, String>`
- HTTP requests use `reqwest` with basic auth and custom headers support
- Connections persist in memory during app lifetime (no disk persistence)

### Frontend Architecture (Vue 3 + TypeScript)
- **State Management**: Pinia stores in `src/stores/` handle application state
- **API Layer**: `src/api/` abstracts Tauri invoke calls vs web API calls
- **Views**: `src/views/` contain main application pages
- **Router**: `src/router.ts` handles navigation

Key components:
- `connection.ts` store manages ES connections and current selection
- `dashboard.ts` store handles cluster health monitoring  
- `search.ts` store manages query execution and results
- API abstraction allows potential web deployment alongside desktop app

### Tauri Commands Available
- Connection: `add_connection`, `list_connections`, `remove_connection`, `test_connection`
- Cluster: `get_cluster_health`
- Indices: `list_indices`, `create_index`, `delete_index`, `get_index_mapping`
- Search: `search_documents`

## Key Features Implemented
- Connection management with basic auth
- Cluster health monitoring
- Index CRUD operations
- DSL query execution with pagination
- JSON/table result views

## Development Notes
- Frontend runs on port 5173 during development
- Tauri development automatically rebuilds Rust code
- Type safety maintained between Rust and TypeScript via shared type definitions
- Uses Arco Design Vue UI components
- All user-facing text currently in Chinese