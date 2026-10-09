@echo off
setlocal
cd /d "%~dp0"
set "FLUXINI_NODE=node"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "FLUXINI_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%~dp0.runtime\node.exe" set "FLUXINI_NODE=%~dp0.runtime\node.exe"
"%FLUXINI_NODE%" scripts\launch.mjs
if errorlevel 1 pause
