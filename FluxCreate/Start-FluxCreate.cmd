@echo off
cd /d "%~dp0"
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "scripts/launch.mjs" fluxcreate
if errorlevel 1 pause
