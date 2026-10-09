@echo off
cd /d "%~dp0"
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "../FluxCreate/scripts/launch.mjs" fluxoto
if errorlevel 1 pause
