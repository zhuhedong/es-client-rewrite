# 跨平台打包指南

## 🎯 核心问题说明

当前遇到的编译错误是因为Linux环境缺少GTK和相关图形库依赖。**这是正常现象**，因为Tauri在Linux上需要系统级的图形库支持。

## 🌍 跨平台打包策略

### 方案一：GitHub Actions自动化构建 (推荐)

这是最简单有效的方案，无需本地安装复杂的环境：

1. **推送代码到GitHub**
2. **创建版本标签触发构建**
3. **自动生成所有平台的安装包**

```bash
# 1. 初始化Git仓库（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 2. 推送到GitHub
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main

# 3. 创建版本标签触发构建
git tag v1.0.0
git push origin v1.0.0
```

✅ **优势**: 
- 无需本地环境配置
- 同时构建Windows/macOS/Linux版本
- 自动发布到GitHub Releases

### 方案二：Docker跨平台构建

对于Linux版本，可以使用Docker：

```bash
# 构建Docker镜像
docker build -f docker/Dockerfile.linux -t es-client-builder .

# 运行构建
docker run --rm -v $(pwd)/dist:/output es-client-builder
```

### 方案三：本地分平台构建

在不同系统上本地构建：

#### Windows系统：
```batch
# 双击运行
scripts/build-windows.bat
```

#### macOS系统：
```bash
chmod +x scripts/build-macos.sh
./scripts/build-macos.sh
```

#### Linux系统（需要安装依赖）：
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y \
    pkg-config \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf

# 然后构建
npm run tauri:build
```

## 🚀 推荐的完整部署流程

### 步骤1: 准备代码
```bash
cd es-client-rewrite

# 确保代码是最新的
git status
git add .
git commit -m "Ready for release"
```

### 步骤2: 使用GitHub Actions
```bash
# 推送到GitHub（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/es-client-rewrite.git
git push -u origin main

# 创建发布版本
git tag v1.0.0
git push origin v1.0.0
```

### 步骤3: 监控构建过程
- 访问你的GitHub仓库
- 点击"Actions"标签页
- 查看构建进度

### 步骤4: 下载构建产物
构建完成后，在"Releases"页面下载：
- `*.msi` - Windows安装包
- `*.dmg` - macOS安装包  
- `*.deb` / `*.AppImage` - Linux安装包

## 📋 各平台构建产物说明

| 平台 | 文件格式 | 说明 |
|------|----------|------|
| Windows | `.msi`, `.exe` | Windows安装程序 |
| macOS | `.dmg`, `.app` | macOS磁盘映像和应用包 |
| Linux | `.deb`, `.rpm`, `.AppImage` | Linux软件包 |

## ⚡ 快速开始（推荐）

如果你想立即开始跨平台打包，使用我们提供的自动化脚本：

```bash
# 给脚本添加执行权限
chmod +x scripts/build.sh

# 使用GitHub Actions进行跨平台构建
./scripts/build.sh github
```

## 🔧 环境配置备注

当前开发环境（Linux）缺少以下依赖：
- `pkg-config`
- `libgtk-3-dev`
- `libwebkit2gtk-4.0-dev`
- `cairo`, `glib`, `pango`等图形库

**这是正常的！** 大多数开发者都会遇到这个问题。使用GitHub Actions是最佳解决方案。

## 📞 获取帮助

如果遇到问题：
1. 查看GitHub Actions构建日志
2. 检查系统依赖是否完整
3. 确认Tauri版本兼容性

**重要**: 前端部分（Vite服务器）运行正常，说明项目结构没有问题。编译错误只是缺少Linux图形库依赖，这不影响使用其他方案进行跨平台打包。