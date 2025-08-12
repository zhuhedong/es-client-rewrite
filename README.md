# ES Client - 现代化 Elasticsearch 桌面客户端

基于 **Rust + Tauri + Vue 3** 构建的高性能 Elasticsearch 桌面客户端，提供直观的数据查询和管理体验。

## ✨ 核心特性

- **🔒 安全连接管理** - AES-256-GCM 加密存储，支持基本认证和自定义请求头
- **🧠 智能查询系统** - 可视化查询构建器 + 高级 DSL 编辑器
- **📊 多视图数据展示** - 表格、卡片、JSON 三种查看模式，支持无限字段显示
- **🔍 实时索引管理** - 索引创建、删除、映射查看和统计监控
- **📱 响应式设计** - 适配不同屏幕尺寸的现代化界面

## 🏗️ 技术架构

### 后端 (Rust + Tauri)
- **Rust**: 高性能、内存安全的系统级编程语言
- **Tauri**: 轻量级跨平台桌面应用框架
- **Tokio**: 异步运行时，高效处理并发请求
- **Reqwest**: 现代化 HTTP 客户端库

### 前端 (Vue 3 + TypeScript)
- **Vue 3**: 组合式 API，响应式框架
- **TypeScript**: 完整的类型安全保障
- **Arco Design Vue**: 企业级 UI 组件库
- **Pinia**: 轻量级状态管理
- **Vite**: 快速构建工具

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0
- Rust >= 1.70
- Tauri CLI >= 2.0

### 安装与运行

```bash
# 克隆项目
git clone <repository-url>
cd es-client-rewrite

# 安装依赖
npm install

# 开发模式 (启动前后端)
npm run tauri:dev

# 构建发布版本
npm run tauri:build
```

## 📋 主要功能

### 连接管理
- ✅ 安全的连接信息加密存储
- ✅ 连接测试和状态验证  
- ✅ 基本认证和自定义请求头支持
- ✅ 连接持久化和自动恢复

### 数据查询
- ✅ **智能查询模式**: 可视化查询构建器，适合新手用户
- ✅ **高级查询模式**: DSL 编辑器，支持复杂查询逻辑
- ✅ 实时字段检测和类型识别
- ✅ 智能分页处理，支持大数据集

### 数据展示
- ✅ **表格视图**: 动态列选择，支持无限字段显示
- ✅ **卡片视图**: 美观的响应式卡片布局
- ✅ **JSON视图**: 完整的原始数据展示
- ✅ 文档详情弹窗，支持多种查看格式

### 索引管理
- ✅ 索引列表查看和搜索
- ✅ 索引创建、删除操作
- ✅ 索引映射结构查看
- ✅ 文档数量和存储统计

### 集群监控
- ✅ 实时集群健康状态
- ✅ 节点信息和状态监控
- ✅ 集群统计信息展示

## 🚀 性能优势

相比传统 Electron 应用，基于 Tauri 的架构带来显著性能提升：

| 指标 | Electron 版本 | Tauri 版本 | 性能提升 |
|------|--------------|------------|---------|
| 📦 安装包大小 | ~150MB | ~30MB | **80%** ⬇️ |
| 💾 内存占用 | ~200MB | ~50MB | **75%** ⬇️ |  
| ⚡ 启动时间 | 3-5秒 | 1-2秒 | **60%** ⬆️ |

## 🛠️ 开发指南

### 常用命令

```bash
# 前端开发
npm run dev                # 仅启动前端开发服务器
npm run build             # 构建前端代码
vue-tsc --noEmit          # TypeScript 类型检查

# Tauri 开发  
npm run tauri:dev         # 启动完整应用 (前端 + 后端)
npm run tauri:build       # 构建桌面应用安装包

# Rust 后端 (在 src-tauri/ 目录下)
cargo build               # 构建 Rust 代码
cargo test                # 运行测试
cargo clippy              # 代码检查和 lint
```

### 项目结构

```
es-client-rewrite/
├── src/                     # Vue 3 前端源码
│   ├── api/                # API 调用抽象层
│   ├── stores/             # Pinia 状态管理
│   ├── views/              # 页面组件
│   └── components/         # 可复用组件
├── src-tauri/               # Rust 后端源码
│   ├── src/
│   │   ├── main.rs         # 应用入口点
│   │   ├── commands.rs     # Tauri 命令处理
│   │   ├── es_client.rs    # Elasticsearch 客户端
│   │   └── types.rs        # 数据类型定义
│   └── Cargo.toml          # Rust 依赖配置
├── package.json            # Node.js 项目配置
└── CLAUDE.md               # AI 开发助手配置
```

### Tauri 命令接口

#### 连接管理
- `add_connection(connection)` - 添加新连接（加密存储）
- `list_connections()` - 获取连接列表
- `remove_connection(id)` - 删除连接
- `test_connection(id)` - 测试连接状态

#### 数据操作
- `search_documents(connection_id, query)` - 执行搜索查询
- `get_cluster_health(connection_id)` - 获取集群健康状态
- `list_indices(connection_id)` - 获取索引列表
- `create_index(connection_id, name, mapping)` - 创建索引
- `delete_index(connection_id, name)` - 删除索引

## 📱 部署说明

### 构建发行版
```bash
npm run tauri:build
```

### 生成的安装包
- **Windows**: `*.msi` 安装包
- **macOS**: `*.dmg` 磁盘镜像  
- **Linux**: `*.deb`, `*.rpm` 包管理器文件

### 系统要求
- **Windows**: Windows 10/11
- **macOS**: macOS 10.15+
- **Linux**: Ubuntu 18.04+ 或其他主流发行版

## 🔒 安全特性

- **AES-256-GCM 加密**: 连接密码使用军工级加密算法存储
- **密钥管理**: 自动生成和管理 32 字节加密密钥
- **文件权限**: 敏感配置文件设置为仅用户可读（600 权限）
- **内存安全**: Rust 语言特性保证编译期内存安全
- **并发安全**: 基于类型系统的线程安全保障

## 🐛 故障排除

### Linux 构建依赖
```bash
# Ubuntu/Debian 系统
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev libappindicator3-dev

# 如果遇到 WebKit 相关错误
sudo apt install libjavascriptcoregtk-4.0-dev libsoup2.4-dev
```

### 清理和重建
```bash
# 清理缓存并重新安装
rm -rf node_modules target/
npm install
npm run tauri:build
```

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 项目到你的 GitHub
2. 创建功能分支: `git checkout -b feature/your-feature`
3. 提交更改: `git commit -m 'Add your feature'`
4. 推送分支: `git push origin feature/your-feature`
5. 创建 Pull Request

### 代码规范
- **Rust**: 使用 `cargo fmt` 和 `cargo clippy`
- **TypeScript**: 遵循 ESLint 和 Prettier 配置
- **提交信息**: 遵循 Conventional Commits 规范

## 📄 许可证

本项目采用 **Apache-2.0** 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

Made with ❤️ by ES Client Team

</div>