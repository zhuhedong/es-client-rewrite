# ES Client Rewrite - 现代化 Elasticsearch 桌面客户端

## 📊 构建状态

![TypeScript](https://img.shields.io/badge/TypeScript-✅%20编译通过-green)  
![Build](https://img.shields.io/badge/Build-✅%20成功-green)  
![Vue3](https://img.shields.io/badge/Vue%203-📦%20已构建-blue)  
![Rust](https://img.shields.io/badge/Rust-🦀%20稳定-orange)  

> **最新状态**: 所有 TypeScript 类型错误已修复，构建测试通过 ✅

## 🚀 项目概述

这是一个基于 **Rust + Tauri** 架构的现代化 Elasticsearch 桌面客户端，提供直观的用户界面、企业级安全性和卓越的性能表现。本项目采用前后端分离架构，结合了 Rust 的高性能后端处理能力和 Vue 3 的现代化前端体验。

## ✨ 核心特性

### 🎨 现代化用户界面
- **扁平化设计**: 采用现代设计语言，简洁美观
- **双查询模式**: 智能查询（新手友好）+ 高级查询（专业用户）
- **响应式布局**: 适配不同屏幕尺寸，完美的桌面体验
- **渐变主题**: 精美的色彩搭配和视觉效果

### 🔒 企业级安全
- **AES-256-GCM 加密**: 连接密码采用军工级加密存储
- **安全主密钥管理**: 自动生成和管理加密密钥
- **文件权限控制**: 敏感文件采用受限权限保护
- **内存安全**: Rust 语言特性保证运行时安全

### 🔍 智能数据查询
- **可视化查询构建器**: 拖拽式条件构建，无需编写 DSL
- **实时字段检测**: 自动识别字段类型和结构
- **多视图展示**: 表格、卡片、JSON 三种查看模式
- **智能分页**: 高性能分页处理，支持大数据集

### 📊 完整数据展示
- **无限制字段显示**: 支持查看文档中的所有字段
- **智能数据截断**: 大数据安全处理，防止界面卡死  
- **循环引用检测**: 安全的 JSON 处理，避免无限递归
- **文档详情弹窗**: 结构化、JSON、纯内容三种详情视图

## 🏗️ 技术架构

### 后端 (Rust + Tauri)
- **🦀 Rust**: 零成本抽象，内存安全，高性能并发
- **⚡ Tauri**: 现代化跨平台框架，资源占用极低
- **🌐 Tokio**: 异步运行时，高效 I/O 处理
- **🔐 AES-GCM**: 军工级加密算法
- **🔄 Reqwest**: 现代化 HTTP 客户端

### 前端 (Vue 3 + TypeScript)
- **💚 Vue 3**: 组合式 API，更好的性能和开发体验
- **📘 TypeScript**: 完整的类型安全保障
- **🎨 Arco Design Vue**: 企业级 UI 组件库
- **🍍 Pinia**: 现代化状态管理
- **⚡ Vite**: 极速构建和热重载

## 📋 功能清单

### ✅ 连接管理
- [x] 安全的连接信息存储（AES-256加密）
- [x] 连接测试和状态验证
- [x] 基本认证和自定义请求头支持
- [x] 连接持久化和自动恢复

### ✅ 最新改进 (Latest Updates)
- [x] 🔧 **TypeScript 构建优化**: 修复所有类型检查错误
  - [x] 修复 GlobalLoadingOverlay 组件的图标导入和状态类型问题
  - [x] 修复通知系统的 MessageReturn 类型兼容性
  - [x] 修复错误处理器的 NotificationConfig 属性匹配
  - [x] 确保完整的 TypeScript 类型安全

### ✅ 智能查询系统
- [x] 🧠 **智能查询模式**: 新手友好的可视化查询构建器
  - [x] 步骤式指导界面
  - [x] 拖拽式条件构建  
  - [x] 快速搜索和模板
  - [x] 实时查询预览
- [x] ⚡ **高级查询模式**: 专业用户的 DSL 编辑器
  - [x] DSL 语法支持
  - [x] 查询模板库
  - [x] 排序条件设置
  - [x] 自定义分页

### ✅ 数据展示系统  
- [x] 📊 **多视图展示**:
  - [x] 表格视图：动态列选择，无字段数量限制
  - [x] 卡片视图：美观的卡片布局，响应式设计
  - [x] JSON视图：完整的原始数据展示
- [x] 🔍 **文档详情系统**:
  - [x] 结构化视图：字段类型标识，安全数据处理
  - [x] JSON完整视图：支持大文档滚动查看
  - [x] 纯内容视图：专注于业务数据
  - [x] 一键复制功能：支持全文档或仅内容复制

### ✅ 索引管理
- [x] 索引列表查看和搜索
- [x] 索引创建和删除操作
- [x] 索引映射结构查看
- [x] 文档数量和存储大小统计

### ✅ 集群监控
- [x] 实时集群健康状态
- [x] 节点信息和状态监控
- [x] 集群统计信息展示

### ✅ 高级功能
- [x] 🔄 **智能分页**: 修复了分页组件的状态管理问题
- [x] 🛡️ **性能优化**: 大数据处理，循环引用检测  
- [x] 📱 **响应式设计**: 适配不同分辨率和窗口大小
- [x] 🎯 **用户体验**: 加载状态、错误提示、操作反馈

## 🚀 性能优势

| 指标 | Electron 版本 | Tauri 版本 | 性能提升 |
|------|--------------|------------|---------|
| 📦 安装包大小 | ~150MB | ~30MB | **80%** ⬇️ |
| 💾 内存占用 | ~200MB | ~50MB | **75%** ⬇️ |  
| ⚡ 启动时间 | 3-5秒 | 1-2秒 | **60%** ⬆️ |
| 🔍 查询处理 | JavaScript | Rust | **显著提升** |
| 🔒 数据安全 | 明文存储 | AES-256加密 | **企业级** |

## 🛠️ 开发环境

### 环境要求
```bash
Node.js >= 18.0
Rust >= 1.70  
Tauri CLI >= 2.0
```

### 快速开始
```bash
# 1. 克隆项目
git clone <repository-url>
cd es-client-rewrite

# 2. 安装依赖
npm install

# 3. 开发模式
npm run tauri:dev

# 4. 构建发布
npm run tauri:build
```

### 开发命令
```bash
# 前端开发
npm run dev                # 启动前端开发服务器
npm run build             # 构建前端代码 ✅ (类型检查通过)
vue-tsc --noEmit          # TypeScript 类型检查 ✅

# Tauri 开发  
npm run tauri:dev         # 启动 Tauri 开发模式
npm run tauri:build       # 构建桌面应用

# Rust 后端
cd src-tauri
cargo build               # 构建 Rust 代码
cargo test                # 运行测试
cargo clippy              # 代码检查
```

## 📁 项目结构

```
es-client-rewrite/
├── 📂 src/                     # Vue 3 前端代码
│   ├── 📂 api/                # API 调用抽象层
│   ├── 📂 stores/             # Pinia 状态管理
│   │   ├── connection.ts      # 连接管理状态
│   │   ├── search.ts          # 搜索结果状态  
│   │   └── index.ts           # 索引管理状态
│   ├── 📂 views/              # 页面组件
│   │   ├── EasySearch.vue     # 智能查询页面
│   │   ├── Search.vue         # 高级查询页面
│   │   └── Dashboard.vue      # 仪表板页面
│   ├── 📄 App.vue             # 主应用组件
│   ├── 📄 style.css           # 全局样式
│   └── 📄 types.ts            # TypeScript 类型定义
├── 📂 src-tauri/               # Rust 后端代码
│   ├── 📂 src/
│   │   ├── 📄 main.rs         # Tauri 应用入口
│   │   ├── 📄 commands.rs     # 命令处理器
│   │   ├── 📄 es_client.rs    # Elasticsearch 客户端
│   │   ├── 📄 crypto.rs       # 加密安全模块
│   │   └── 📄 types.rs        # 数据类型定义
│   ├── 📄 Cargo.toml          # Rust 依赖配置
│   └── 📄 tauri.conf.json     # Tauri 配置
├── 📄 package.json            # Node.js 项目配置
├── 📄 CLAUDE.md               # AI 开发助手配置
└── 📄 README.md               # 项目文档
```

## 🔧 Tauri 命令接口

### 连接管理
- `add_connection(connection)` - 添加新连接（加密存储）
- `list_connections()` - 获取连接列表
- `remove_connection(id)` - 删除连接
- `test_connection(id)` - 测试连接状态

### 集群操作
- `get_cluster_health(connection_id)` - 获取集群健康状态

### 索引管理
- `list_indices(connection_id)` - 获取索引列表
- `create_index(connection_id, name, mapping)` - 创建索引
- `delete_index(connection_id, name)` - 删除索引
- `get_index_mapping(connection_id, name)` - 获取索引映射

### 数据查询
- `search_documents(connection_id, query)` - 执行搜索查询

## 🔒 安全特性

### 数据加密
- **AES-256-GCM**: 连接密码使用军工级加密标准
- **密钥管理**: 自动生成和管理32字节加密密钥
- **文件权限**: 敏感配置文件设置为仅用户可读（600权限）

### 内存安全
- **Rust 语言特性**: 编译期内存安全保证
- **无垃圾回收**: 零运行时开销的内存管理
- **并发安全**: 基于类型系统的并发安全保障

## 🎯 用户体验亮点

### 智能查询模式
1. **步骤式指导**: 四步完成查询配置
2. **可视化构建**: 无需学习 DSL 语法
3. **实时预览**: 查询配置实时预览
4. **快速搜索**: 全文搜索快捷入口

### 数据展示优化
1. **无字段限制**: 支持显示任意数量字段
2. **智能类型识别**: 自动识别并标注字段类型
3. **性能优化**: 大数据安全处理，避免界面卡死
4. **灵活视图**: 表格、卡片、JSON多种查看方式

## 📱 部署说明

### 构建发行版
```bash
npm run tauri:build
```

### 生成的文件
- **Windows**: `*.msi` 安装包
- **macOS**: `*.dmg` 磁盘镜像  
- **Linux**: `*.deb`, `*.rpm` 包管理器文件

### 系统要求
- **Windows**: Windows 10/11
- **macOS**: macOS 10.15+
- **Linux**: Ubuntu 18.04+ / 类似发行版

## 🐛 故障排除

### Linux 构建问题
```bash
# Ubuntu/Debian 系统依赖
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev libappindicator3-dev

# 如果遇到 WebKit 相关错误
sudo apt install libjavascriptcoregtk-4.0-dev libsoup2.4-dev
```

### 开发环境问题
```bash
# 清理缓存
npm run clean
rm -rf node_modules
npm install

# 重新构建
npm run tauri:build
```

## 🛣️ 开发路线图

### 🎯 下一版本 (v2.0)
- [ ] 🔌 **插件系统**: 支持自定义功能扩展
- [ ] 📊 **数据可视化**: 图表和仪表板功能
- [ ] 📝 **查询历史**: 查询记录和收藏功能
- [ ] 🌐 **多语言支持**: 国际化界面

### 🔮 未来计划 (v3.0+)
- [ ] 🤖 **AI 查询助手**: 自然语言转 DSL
- [ ] 🔄 **数据同步**: 跨设备配置同步
- [ ] 🎨 **主题系统**: 可自定义界面主题
- [ ] 📱 **Web 版本**: 基于相同后端的 Web 客户端

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 开发流程
1. **Fork** 项目到你的 GitHub
2. 创建**功能分支**: `git checkout -b feature/amazing-feature`
3. **提交更改**: `git commit -m 'Add amazing feature'`
4. **推送分支**: `git push origin feature/amazing-feature`
5. 创建 **Pull Request**

### 代码规范
- **Rust**: 使用 `cargo fmt` 和 `cargo clippy`
- **TypeScript**: 使用 ESLint 和 Prettier
- **提交信息**: 遵循 Conventional Commits 规范

## 📄 许可证

本项目采用 **Apache-2.0** 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢 **Tauri** 团队提供优秀的跨平台框架
- 感谢 **Vue.js** 和 **Arco Design** 提供现代化的前端技术栈
- 感谢 **Rust** 社区提供高性能的系统编程语言
- 感谢所有贡献者和用户的支持与反馈

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

Made with ❤️ by ES Client Team

</div>