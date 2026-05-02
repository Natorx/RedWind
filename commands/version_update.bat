@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 版本更新工具
echo ========================================
echo.

:: 设置路径
set "PATH1=C:\Users\Administrator\Desktop\RedWind\package.json"
set "PATH2=C:\Users\Administrator\Desktop\RedWind\src-tauri\tauri.conf.json"
set "PATH3=C:\Users\Administrator\Desktop\RedWind\src-tauri\Cargo.toml"

echo 使用以下路径:
echo 1. !PATH1!
echo 2. !PATH2!
echo 3. !PATH3!
echo.

:: 读取package.json版本
for /f "tokens=2 delims=:," %%a in ('type "!PATH1!" ^| findstr /i "version"') do (
    set "V1=%%~a"
    set "V1=!V1:"=!"
    set "V1=!V1: =!"
    goto :got1
)
:got1

:: 读取tauri.conf.json版本
for /f "tokens=2 delims=:," %%a in ('type "!PATH2!" ^| findstr /i "version"') do (
    set "V2=%%~a"
    set "V2=!V2:"=!"
    set "V2=!V2: =!"
    goto :got2
)
:got2

:: 读取Cargo.toml版本
for /f "tokens=2 delims==" %%a in ('type "!PATH3!" ^| findstr /i "version"') do (
    set "V3=%%~a"
    set "V3=!V3:"=!"
    set "V3=!V3: =!"
    goto :got3
)
:got3

echo 当前版本:
echo package.json: !V1!
echo tauri.conf.json: !V2!
echo Cargo.toml: !V3!
echo.

:: 解析版本号
for /f "tokens=1-3 delims=." %%a in ("!V1!") do (
    set "MAJOR=%%a"
    set "MINOR=%%b"
    set "PATCH=%%c"
)
set /a "NEW_PATCH=!PATCH!+1"
set "NEW_VERSION=!MAJOR!.!MINOR!.!NEW_PATCH!"

echo 将更新到版本: !NEW_VERSION!
echo.

:: 创建临时文件并替换
set "TEMP1=%TEMP%\temp1.txt"
set "TEMP2=%TEMP%\temp2.txt"
set "TEMP3=%TEMP%\temp3.txt"

:: 更新package.json
(for /f "usebackq delims=" %%i in ("!PATH1!") do (
    set "line=%%i"
    set "line=!line:%V1%=%NEW_VERSION%!"
    echo !line!
)) > "!TEMP1!"
copy /y "!TEMP1!" "!PATH1!" >nul

:: 更新tauri.conf.json
(for /f "usebackq delims=" %%i in ("!PATH2!") do (
    set "line=%%i"
    set "line=!line:%V2%=%NEW_VERSION%!"
    echo !line!
)) > "!TEMP2!"
copy /y "!TEMP2!" "!PATH2!" >nul

:: 更新Cargo.toml
(for /f "usebackq delims=" %%i in ("!PATH3!") do (
    set "line=%%i"
    set "line=!line:%V3%=%NEW_VERSION%!"
    echo !line!
)) > "!TEMP3!"
copy /y "!TEMP3!" "!PATH3!" >nul

del "!TEMP1!" "!TEMP2!" "!TEMP3!" 2>nul

echo.
echo ========================================
echo 更新完成!
echo !V1! -^> !NEW_VERSION!
echo ========================================
pause