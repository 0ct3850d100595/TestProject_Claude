@echo off
setlocal

REM Use the specified folder, or current directory if no argument given
if "%~1"=="" (
    set "TARGET_DIR=%CD%"
) else (
    set "TARGET_DIR=%~1"
)

REM Check if folder exists
if not exist "%TARGET_DIR%" (
    echo Error: Folder not found: %TARGET_DIR%
    pause
    exit /b 1
)

REM Launch VSCode in the target folder
echo Opening VSCode: %TARGET_DIR%
code "%TARGET_DIR%"

endlocal
