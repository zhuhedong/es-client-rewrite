# GitHub 跨平台自动打包完整指南

## 🎯 核心思路

当前Linux环境编译失败是正常的（缺少图形库），但我们可以使用**GitHub Actions**在云端完成跨平台构建。

## 📋 完整步骤

### 步骤1: 准备GitHub仓库

```bash
# 1. 在GitHub创建新仓库
# 访问 https://github.com/new
# 仓库名: es-client-rewrite
# 类型: Public（Private也可以）

# 2. 初始化本地Git
cd es-client-rewrite
git init
git add .
git commit -m "ES Client Tauri重写版本"

# 3. 连接到GitHub仓库（替换为你的用户名和仓库名）
git remote add origin https://github.com/YOUR_USERNAME/es-client-rewrite.git
git branch -M main
git push -u origin main
```

### 步骤2: 推送代码和配置

代码推送后，GitHub Actions会自动检测到 `.github/workflows/build.yml` 文件，但不会立即触发构建。

### 步骤3: 创建Release触发构建

```bash
# 创建版本标签（这会触发自动构建）
git tag v1.0.0
git push origin v1.0.0
```

### 步骤4: 监控构建过程

1. 访问你的GitHub仓库
2. 点击 **"Actions"** 标签页
3. 查看 **"Build and Release"** 工作流
4. 等待构建完成（约10-15分钟）

### 步骤5: 下载构建产物

构建完成后：
1. 访问仓库的 **"Releases"** 页面
2. 找到 **"ES Client v1.0.0"** 发布版本
3. 下载对应平台的安装包：
   - `*.msi` - Windows安装程序
   - `*.dmg` - macOS安装包
   - `*.deb` / `*.rpm` / `*.AppImage` - Linux安装包

## 🔧 GitHub Actions配置说明

我已经为你创建了 `.github/workflows/build.yml`，它会：

- **并行构建3个平台**: Windows、macOS、Linux
- **自动安装依赖**: 每个平台的系统依赖和Rust环境
- **构建完整应用**: 前端+后端+打包
- **自动发布**: 上传到GitHub Releases

## 🚀 一键部署脚本

我来为你创建一个自动化脚本：