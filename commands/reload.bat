@echo off
echo 正在清理项目...

cd /d "C:\Users\Administrator\Desktop\RedWind" || exit /b

:: 删除 node_modules
rmdir /s /q node_modules 2>nul

:: 清理 Rust
cd src-tauri
cargo clean 2>nul
cd ..

:: 重新安装
pnpm i -w

echo 完成！
pause