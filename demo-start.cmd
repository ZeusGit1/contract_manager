@echo off
REM Double-click launcher for the Contract Manager demo.
REM Runs demo-start.ps1 with PowerShell execution policy bypassed
REM so no per-machine policy change is needed.

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%demo-start.ps1"
