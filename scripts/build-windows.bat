@echo off
setlocal

echo 🚀 Windows 平台构建脚本

REM 检查环境
echo 📋 检查构建环境...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm 未安装，请先安装 npm
    exit /b 1
)

where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Rust 未安装，请先安装 Rust
    echo 请访问: https://rustup.rs/
    exit /b 1
)

echo ✅ 环境检查完成

REM 安装依赖
echo 📦 安装依赖...
call npm ci
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 依赖安装失败
    exit /b 1
)

REM 构建前端
echo 🔨 构建前端...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 前端构建失败
    exit /b 1
)

REM 构建 Tauri 应用
echo ⚡ 构建 Tauri 应用...
call npm run tauri:build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Tauri 构建失败
    exit /b 1
)

echo ✅ Windows 构建完成
echo 📁 构建文件位于: src-tauri\target\release\bundle\

REM 显示构建结果
echo.
echo 📦 构建产物:
dir /B src-tauri\target\release\bundle\msi\ 2>nul
dir /B src-tauri\target\release\bundle\nsis\ 2>nul

pause