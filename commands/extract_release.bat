@echo off
chcp 65001 >nul

:: 源目录
set SOURCE_DIR=C:\Users\Administrator\Desktop\RedWind\src-tauri\target\release\bundle\nsis

:: 目标目录（桌面）
set DEST_DIR=C:\Users\Administrator\Desktop

:: 检查源目录是否存在
if not exist "%SOURCE_DIR%" (
    echo ❌ 错误: 找不到源目录
    echo %SOURCE_DIR%
    pause
    exit /b 1
)

:: 检查是否有文件
dir "%SOURCE_DIR%\*" /a-d >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 源目录为空
    pause
    exit /b 1
)

:: 复制所有内容
echo 📁 正在复制文件...
echo    源目录: %SOURCE_DIR%
echo    目标目录: %DEST_DIR%
echo.

xcopy "%SOURCE_DIR%\*" "%DEST_DIR%\" /E /Y /I

if errorlevel 1 (
    echo.
    echo ❌ 复制失败
) else (
    echo.
    echo ✅ 复制成功!
    echo 📂 文件已复制到桌面
)

echo.
pause