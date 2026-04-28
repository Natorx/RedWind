@echo off
chcp 65001 >nul
title 项目启动器
cls

echo ========================================
echo         项目启动器
echo ========================================
echo.
echo [1] GameStorm
echo [2] RedWind
echo [3] Summafiya
echo.
choice /c 123 /n /m "请选择项目 (1/2/3): "

if errorlevel 3 goto summafiya
if errorlevel 2 goto redwind
if errorlevel 1 goto gamestorm

:gamestorm
cd /d "%USERPROFILE%\Desktop\GameStorm"
goto select_command

:redwind
cd /d "%USERPROFILE%\Desktop\RedWind"
goto select_command

:summafiya
cd /d "%USERPROFILE%\Desktop\Summafiya"
goto select_command

:select_command
echo.
echo 已进入: %cd%
echo.
echo ========================================
echo         可用启动指令
echo ========================================
echo.
echo [1] pnpm dev_svelte
echo [2] pnpm dev_server
echo [3] pnpm dev_client
echo [4] pnpm ds
echo [5] pnpm dv
echo [6] pnpm vp
echo [7] pnpm dr
echo.
choice /c 1234567 /n /m "请选择启动方式 (1-7): "

if errorlevel 7 goto cmd7
if errorlevel 6 goto cmd6
if errorlevel 5 goto cmd5
if errorlevel 4 goto cmd4
if errorlevel 3 goto cmd3
if errorlevel 2 goto cmd2
if errorlevel 1 goto cmd1

:cmd1
echo.
echo 正在启动 dev_svelte...
pnpm dev_svelte
goto end

:cmd2
echo.
echo 正在启动 dev_server...
pnpm dev_server
goto end

:cmd3
echo.
echo 正在启动 dev_client...
pnpm dev_client
goto end

:cmd4
echo.
echo 正在启动 ds...
pnpm ds
goto end

:cmd5
echo.
echo 正在启动 dv...
pnpm dv
goto end

:cmd6
echo.
echo 正在启动 vp...
pnpm vp
goto end

:cmd7
echo.
echo 正在启动 dr...
pnpm dr
goto end

:end
echo.
pause