@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
if not exist dist\index.html (
  echo Please run pnpm install and pnpm build first.
  pause
  exit /b 1
)
node scripts\launch.mjs
