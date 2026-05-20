#!/bin/bash

echo "正在清理项目..."

cd "$HOME/Desktop/RedWind" || { echo "目录不存在"; exit 1; }

rm -rf node_modules
cd src-tauri && cargo clean 2>/dev/null; cd ..
pnpm i -w

echo "完成！"
read -p "按回车键退出..."