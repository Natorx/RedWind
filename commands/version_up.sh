#!/bin/bash

# 设置 jq 路径（处理空格问题）
if command -v jq &> /dev/null; then
    JQ_CMD="jq"
elif [ -f "/c/Program Files/Git/bin/jq.exe" ]; then
    JQ_CMD="/c/Program\ Files/Git/bin/jq.exe"
else
    echo "❌ 请先安装 jq"
    exit 1
fi

PATH1="$HOME/Desktop/RedWind/package.json"
PATH2="$HOME/Desktop/RedWind/src-tauri/tauri.conf.json"
PATH3="$HOME/Desktop/RedWind/src-tauri/Cargo.toml"

echo "========================================"
echo "版本更新工具"
echo "========================================"
echo ""

# 检查文件是否存在
if [ ! -f "$PATH1" ] || [ ! -f "$PATH2" ] || [ ! -f "$PATH3" ]; then
    echo "❌ 找不到配置文件"
    exit 1
fi

# 读取版本（使用 eval 处理带空格的路径）
V1=$(eval "$JQ_CMD -r '.version' \"$PATH1\"")
V2=$(eval "$JQ_CMD -r '.version' \"$PATH2\"")
V3=$(grep '^version' "$PATH3" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')

# 检查是否成功读取版本
if [ -z "$V1" ] || [ -z "$V2" ]; then
    echo "❌ 读取版本失败"
    echo "package.json: $V1"
    echo "tauri.conf.json: $V2"
    exit 1
fi

echo "当前版本:"
echo "package.json: $V1"
echo "tauri.conf.json: $V2"
echo "Cargo.toml: $V3"
echo ""

# 增加 PATCH 版本
NEW_VERSION=$(echo "$V1" | awk -F. '{$NF++; print $1"."$2"."$NF}')
echo "将更新到: $NEW_VERSION"
echo ""

# 创建临时文件
TMP1=$(mktemp)
TMP2=$(mktemp)
TMP3=$(mktemp)

# 更新 package.json
eval "$JQ_CMD '.version = \"$NEW_VERSION\"' \"$PATH1\"" > "$TMP1" && mv "$TMP1" "$PATH1"

# 更新 tauri.conf.json
eval "$JQ_CMD '.version = \"$NEW_VERSION\"' \"$PATH2\"" > "$TMP2" && mv "$TMP2" "$PATH2"

# 更新 Cargo.toml
sed "s/^version = \"$V3\"/version = \"$NEW_VERSION\"/" "$PATH3" > "$TMP3" && mv "$TMP3" "$PATH3"

# 清理临时文件
rm -f "$TMP1" "$TMP2" "$TMP3" 2>/dev/null

echo "✅ 更新完成! $V1 -> $NEW_VERSION"
read -p "按回车键退出..."