#!/bin/bash
set -e  # 遇到错误立即退出

export LANG=zh_CN.UTF-8

SOURCE_DIR="$HOME/Desktop/RedWind/src-tauri/target/release/bundle/nsis"
DEST_DIR="$HOME/Desktop"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 检查源目录
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ 错误: 找不到源目录${NC}"
    echo "$SOURCE_DIR"
    exit 1
fi

# 检查是否为空
if [ -z "$(ls -A "$SOURCE_DIR")" ]; then
    echo -e "${RED}❌ 错误: 源目录为空${NC}"
    exit 1
fi

# 复制文件
echo "📁 正在复制文件..."
cp -rfv "$SOURCE_DIR"/* "$DEST_DIR/"

echo -e "${GREEN}✅ 复制成功!${NC}"
echo "📂 文件已复制到桌面"