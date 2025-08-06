@echo off
echo 🚀 ES Client GitHub 自动部署脚本 (Windows版本)
echo ==================================

REM 检查Git
git --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git 未安装，请先安装 Git
    pause
    exit /b 1
)

REM 初始化Git（如果需要）
git rev-parse --git-dir >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 初始化Git仓库...
    git init
)

REM 提交所有更改
echo 📝 添加并提交更改...
git add .
git commit -m "准备发布到GitHub" 2>nul

REM 获取用户输入
set /p GITHUB_USERNAME="请输入GitHub用户名: "
set /p GITHUB_REPO="仓库名 (默认: es-client-rewrite): "
if "%GITHUB_REPO%"=="" set GITHUB_REPO=es-client-rewrite

set /p VERSION="发布版本 (默认: v1.0.0): "
if "%VERSION%"=="" set VERSION=v1.0.0

set GITHUB_URL=https://github.com/%GITHUB_USERNAME%/%GITHUB_REPO%.git

echo.
echo GitHub仓库: %GITHUB_URL%
echo 发布版本: %VERSION%
echo.

REM 配置远程仓库
echo 🔗 配置Git远程仓库...
git remote remove origin 2>nul
git remote add origin %GITHUB_URL%

REM 推送代码
echo 📤 推送代码到GitHub...
git checkout -b main 2>nul || git checkout main
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 代码推送失败，请检查:
    echo 1. GitHub用户名和仓库名是否正确
    echo 2. 是否有权限推送到该仓库
    echo 3. 网络连接是否正常
    pause
    exit /b 1
)

REM 创建并推送标签
echo 🏷️ 创建发布标签...
git tag -d %VERSION% 2>nul
git tag -a %VERSION% -m "发布 %VERSION% 版本"
git push origin %VERSION%

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 标签推送失败
    pause
    exit /b 1
)

echo.
echo 🎉 部署完成！
echo ==================================
echo 📋 后续步骤:
echo 1. 访问 https://github.com/%GITHUB_USERNAME%/%GITHUB_REPO%
echo 2. 点击 'Actions' 标签页查看构建进度
echo 3. 等待构建完成（约10-15分钟）
echo 4. 在 'Releases' 页面下载安装包
echo.
echo 🔗 快速链接:
echo - 仓库地址: https://github.com/%GITHUB_USERNAME%/%GITHUB_REPO%
echo - Actions页面: https://github.com/%GITHUB_USERNAME%/%GITHUB_REPO%/actions
echo - Releases页面: https://github.com/%GITHUB_USERNAME%/%GITHUB_REPO%/releases
echo.
echo 💡 构建完成后，你将获得:
echo - Windows: .msi 安装程序
echo - macOS: .dmg 安装包  
echo - Linux: .deb/.rpm/.AppImage 安装包

pause