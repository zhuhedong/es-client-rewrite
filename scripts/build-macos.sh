#!/bin/bash

# macOS 构建脚本

set -e

echo "🚀 macOS 平台构建脚本"

# 检查环境
echo "📋 检查构建环境..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请使用 Homebrew 安装:"
    echo "brew install node"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust 未安装，请安装 Rust:"
    echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# 检查 Xcode Command Line Tools
if ! xcode-select -p &> /dev/null; then
    echo "❌ Xcode Command Line Tools 未安装，请运行:"
    echo "xcode-select --install"
    exit 1
fi

echo "✅ 环境检查完成"

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 构建前端
echo "🔨 构建前端..."
npm run build

# 构建 Tauri 应用
echo "⚡ 构建 Tauri 应用..."
npm run tauri:build

echo "✅ macOS 构建完成"
echo "📁 构建文件位于: src-tauri/target/release/bundle/"

# 显示构建结果
echo ""
echo "📦 构建产物:"
ls -la src-tauri/target/release/bundle/dmg/ 2>/dev/null || echo "DMG 文件未找到"
ls -la src-tauri/target/release/bundle/macos/ 2>/dev/null || echo "App 文件未找到"