#!/bin/bash

# 跨平台构建脚本
# 使用 Docker 和 GitHub Actions 进行跨平台构建

set -e

echo "🚀 开始跨平台构建..."

# 检查必要工具
check_requirements() {
    echo "📋 检查构建环境..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        echo "❌ Git 未安装，请先安装 Git"
        exit 1
    fi
    
    echo "✅ 环境检查完成"
}

# 设置构建配置
setup_build() {
    echo "⚙️  设置构建配置..."
    
    # 创建构建目录
    mkdir -p dist/releases
    
    # 获取版本信息
    VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
    echo "📦 当前版本: $VERSION"
    
    export BUILD_VERSION=$VERSION
}

# Windows 构建 (使用 Windows Server 2019)
build_windows() {
    echo "🪟 构建 Windows 版本..."
    
    # 使用 GitHub Actions 或本地 Windows 环境
    echo "Windows 构建需要在 Windows 环境中进行"
    echo "请使用以下命令在 Windows 系统中构建:"
    echo "npm install"
    echo "npm run tauri:build"
}

# macOS 构建
build_macos() {
    echo "🍎 构建 macOS 版本..."
    
    # 需要在 macOS 环境中运行
    echo "macOS 构建需要在 macOS 环境中进行"
    echo "请使用以下命令在 macOS 系统中构建:"
    echo "npm install"
    echo "npm run tauri:build"
}

# Linux 构建 (使用 Docker)
build_linux() {
    echo "🐧 构建 Linux 版本..."
    
    # 使用 Docker 构建 Linux 版本
    docker build -f docker/Dockerfile.linux -t es-client-builder .
    
    # 运行构建容器
    docker run --rm -v $(pwd)/dist:/app/dist es-client-builder
    
    echo "✅ Linux 构建完成"
}

# 本地快速构建 (当前平台)
build_local() {
    echo "💻 构建当前平台版本..."
    
    # 安装依赖
    echo "📦 安装依赖..."
    npm ci
    
    # 构建前端
    echo "🔨 构建前端..."
    npm run build
    
    # 构建 Tauri 应用
    echo "⚡ 构建 Tauri 应用..."
    npm run tauri:build
    
    echo "✅ 当前平台构建完成"
    echo "📁 构建文件位于: src-tauri/target/release/bundle/"
}

# 使用 GitHub Actions 进行完整跨平台构建
build_github_actions() {
    echo "🌐 使用 GitHub Actions 进行跨平台构建..."
    
    # 检查是否在 Git 仓库中
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "❌ 当前目录不是 Git 仓库"
        exit 1
    fi
    
    # 创建并推送标签
    echo "🏷️  创建版本标签..."
    git tag "v$BUILD_VERSION"
    git push origin "v$BUILD_VERSION"
    
    echo "✅ 标签已推送，GitHub Actions 将自动开始构建"
    echo "🔗 查看构建进度: https://github.com/YOUR_USERNAME/YOUR_REPO/actions"
}

# 主函数
main() {
    case "${1:-local}" in
        "windows")
            check_requirements
            setup_build
            build_windows
            ;;
        "macos")
            check_requirements
            setup_build
            build_macos
            ;;
        "linux")
            check_requirements
            setup_build
            build_linux
            ;;
        "local")
            check_requirements
            setup_build
            build_local
            ;;
        "github")
            check_requirements
            setup_build
            build_github_actions
            ;;
        "all")
            echo "🌍 开始完整跨平台构建..."
            check_requirements
            setup_build
            build_github_actions
            ;;
        *)
            echo "用法: $0 [windows|macos|linux|local|github|all]"
            echo ""
            echo "选项:"
            echo "  windows  - 构建 Windows 版本"
            echo "  macos    - 构建 macOS 版本"
            echo "  linux    - 构建 Linux 版本"
            echo "  local    - 构建当前平台版本"
            echo "  github   - 使用 GitHub Actions 构建所有平台"
            echo "  all      - 同 github"
            exit 1
            ;;
    esac
}

main "$@"