@echo off
cd /d "%~dp0"
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "../FluxCreate/scripts/launch.mjs" flux3d
if errorlevel 1 pause
