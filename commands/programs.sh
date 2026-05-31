#!/bin/bash

# 设置终端编码为 UTF-8
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8

clear

echo "========================================"
echo "         RedWind 启动器"
echo "========================================"
echo ""

# 进入项目目录
cd "$HOME/Desktop/RedWind" 2>/dev/null || {
    echo "错误: 目录 $HOME/Desktop/RedWind 不存在"
    exit 1
}

echo "已进入: $(pwd)"
echo ""
echo "请选择要执行的指令："
echo ""
echo "[1] 运行客户端  (pnpm dc)"
echo "[2] 运行服务    (pnpm ds)"
echo "[3] 运行智能体  (pnpm agent)"
echo "[4] 升级版本    (pnpm updater)"
echo "[5] 打包        (pnpm tauri build)"
echo "[6] 格式化      (pnpm fmt)"
echo "[7] 获取格式化文件 (pnpm get_build)"
echo ""

read -p "请输入选项 (1-7): " cmd_choice

case $cmd_choice in
    1) echo "正在启动客户端..."; pnpm dc ;;
    2) echo "正在启动服务..."; pnpm ds ;;
    3) echo "正在启动智能体..."; pnpm agent ;;
    4) echo "正在升级版本..."; pnpm updater ;;
    5) echo "正在打包..."; pnpm tauri build ;;
    6) echo "正在格式化..."; pnpm fmt ;;
    7) echo "正在获取格式化文件..."; pnpm get_build ;;
    *) echo "无效选择"; exit 1 ;;
esac

echo ""
read -p "按回车键退出..."
