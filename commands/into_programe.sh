#!/bin/bash

# 设置终端编码为 UTF-8（Linux/Mac 默认支持，Windows Git Bash 会自动处理）
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8

# 设置标题（Git Bash 中不直接支持，此命令在部分终端有效）
echo -ne "\033]0;项目启动器\007"

clear

echo "========================================"
echo "         项目启动器"
echo "========================================"
echo ""
echo "[1] GameStorm"
echo "[2] RedWind"
echo "[3] Summafiya"
echo ""
read -p "请选择项目 (1/2/3): " project_choice

case $project_choice in
    1)
        cd "$HOME/Desktop/GameStorm" 2>/dev/null || {
            echo "错误: 目录不存在"
            exit 1
        }
        ;;
    2)
        cd "$HOME/Desktop/RedWind" 2>/dev/null || {
            echo "错误: 目录不存在"
            exit 1
        }
        ;;
    3)
        cd "$HOME/Desktop/Summafiya" 2>/dev/null || {
            echo "错误: 目录不存在"
            exit 1
        }
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
echo "已进入: $(pwd)"
echo ""
echo "========================================"
echo "         可用启动指令"
echo "========================================"
echo ""
echo "[1] pnpm dev_svelte"
echo "[2] pnpm dev_server"
echo "[3] pnpm dc"
echo "[4] pnpm ds"
echo "[5] pnpm dv"
echo "[6] pnpm vp"
echo "[7] pnpm dr"
echo "[8] pnpm tauri build"
echo ""
read -p "请选择启动方式 (1-8): " cmd_choice

case $cmd_choice in
    1)
        echo ""
        echo "正在启动 dev_svelte..."
        pnpm dev_svelte
        ;;
    2)
        echo ""
        echo "正在启动 dev_server..."
        pnpm dev_server
        ;;
    3)
        echo ""
        echo "正在启动 dev_client..."
        pnpm dc
        ;;
    4)
        echo ""
        echo "正在启动 ds..."
        pnpm ds
        ;;
    5)
        echo ""
        echo "正在启动 dv..."
        pnpm dv
        ;;
    6)
        echo ""
        echo "正在启动 vp..."
        pnpm vp
        ;;
    7)
        echo ""
        echo "正在启动 dr..."
        pnpm dr
        ;;
    8)
        echo ""
        echo "正在构建 Tauri 应用..."
        pnpm tauri build
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
read -p "按回车键退出..."