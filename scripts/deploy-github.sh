#!/bin/bash

# GitHub 自动部署脚本
# 一键完成从代码推送到跨平台构建的全流程

set -e

echo "🚀 ES Client GitHub 自动部署脚本"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Git状态
check_git_status() {
    echo -e "${BLUE}📋 检查Git状态...${NC}"
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}❌ 当前目录不是Git仓库${NC}"
        echo "初始化Git仓库..."
        git init
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠️  发现未提交的更改${NC}"
        echo "添加并提交所有更改..."
        git add .
        git commit -m "准备发布到GitHub" || echo "没有需要提交的更改"
    fi
    
    echo -e "${GREEN}✅ Git状态检查完成${NC}"
}

# 获取用户输入
get_user_input() {
    echo -e "${BLUE}📝 配置GitHub信息...${NC}"
    
    # 获取GitHub用户名和仓库名
    if [ -z "$GITHUB_USERNAME" ]; then
        read -p "请输入GitHub用户名: " GITHUB_USERNAME
    fi
    
    if [ -z "$GITHUB_REPO" ]; then
        GITHUB_REPO="es-client-rewrite"
        read -p "仓库名 (默认: $GITHUB_REPO): " input_repo
        if [ ! -z "$input_repo" ]; then
            GITHUB_REPO="$input_repo"
        fi
    fi
    
    # 获取版本号
    current_version=$(grep '"version"' package.json | cut -d'"' -f4)
    VERSION="v$current_version"
    read -p "发布版本 (默认: $VERSION): " input_version
    if [ ! -z "$input_version" ]; then
        VERSION="$input_version"
    fi
    
    GITHUB_URL="https://github.com/$GITHUB_USERNAME/$GITHUB_REPO.git"
    
    echo -e "${GREEN}GitHub仓库: $GITHUB_URL${NC}"
    echo -e "${GREEN}发布版本: $VERSION${NC}"
}

# 配置Git远程仓库
setup_remote() {
    echo -e "${BLUE}🔗 配置Git远程仓库...${NC}"
    
    # 检查是否已有origin
    if git remote get-url origin > /dev/null 2>&1; then
        current_url=$(git remote get-url origin)
        if [ "$current_url" != "$GITHUB_URL" ]; then
            echo "更新origin URL: $current_url -> $GITHUB_URL"
            git remote set-url origin "$GITHUB_URL"
        fi
    else
        echo "添加origin: $GITHUB_URL"
        git remote add origin "$GITHUB_URL"
    fi
    
    echo -e "${GREEN}✅ 远程仓库配置完成${NC}"
}

# 推送代码
push_code() {
    echo -e "${BLUE}📤 推送代码到GitHub...${NC}"
    
    # 确保在main分支
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        echo "切换到main分支..."
        git checkout -b main 2>/dev/null || git checkout main
    fi
    
    echo "推送代码..."
    git push -u origin main
    
    echo -e "${GREEN}✅ 代码推送完成${NC}"
}

# 创建并推送标签
create_release() {
    echo -e "${BLUE}🏷️  创建发布标签...${NC}"
    
    # 删除本地标签（如果存在）
    git tag -d "$VERSION" 2>/dev/null || true
    
    # 创建新标签
    git tag -a "$VERSION" -m "发布 $VERSION 版本"
    
    # 推送标签
    git push origin "$VERSION"
    
    echo -e "${GREEN}✅ 发布标签创建完成${NC}"
}

# 显示结果
show_results() {
    echo ""
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo "=================================="
    echo -e "${YELLOW}📋 后续步骤:${NC}"
    echo "1. 访问 https://github.com/$GITHUB_USERNAME/$GITHUB_REPO"
    echo "2. 点击 'Actions' 标签页查看构建进度"
    echo "3. 等待构建完成（约10-15分钟）"
    echo "4. 在 'Releases' 页面下载安装包"
    echo ""
    echo -e "${BLUE}🔗 快速链接:${NC}"
    echo "- 仓库地址: https://github.com/$GITHUB_USERNAME/$GITHUB_REPO"
    echo "- Actions页面: https://github.com/$GITHUB_USERNAME/$GITHUB_REPO/actions"
    echo "- Releases页面: https://github.com/$GITHUB_USERNAME/$GITHUB_REPO/releases"
    echo ""
    echo -e "${GREEN}💡 构建完成后，你将获得:${NC}"
    echo "- Windows: .msi 安装程序"
    echo "- macOS: .dmg 安装包"
    echo "- Linux: .deb/.rpm/.AppImage 安装包"
}

# 错误处理
handle_error() {
    echo -e "${RED}❌ 部署过程中出现错误${NC}"
    echo "请检查:"
    echo "1. GitHub用户名和仓库名是否正确"
    echo "2. 是否有权限推送到该仓库"
    echo "3. 网络连接是否正常"
    exit 1
}

# 主函数
main() {
    # 设置错误处理
    trap handle_error ERR
    
    echo "本脚本将帮助你:"
    echo "1. 推送代码到GitHub"
    echo "2. 创建发布标签"
    echo "3. 触发自动构建"
    echo "4. 生成跨平台安装包"
    echo ""
    
    read -p "是否继续? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "操作已取消"
        exit 0
    fi
    
    check_git_status
    get_user_input
    setup_remote
    push_code
    create_release
    show_results
}

# 运行主函数
main "$@"