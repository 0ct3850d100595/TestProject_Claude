# =========================================
# Launch VS Code + Claude Code (CLI method)
# - Opens VS Code in the project folder
# - Opens a separate PowerShell window in the same folder
# - Runs 'claude' in that PowerShell window
#
# Usage: .\launch_claude_cli.ps1
# =========================================

# *** Change this to your project folder ***
$PROJECT_DIR = "D:\TestProject_Claude"

# --- Check project folder ---
if (-not (Test-Path $PROJECT_DIR)) {
    Write-Host "[ERROR] Folder not found: $PROJECT_DIR" -ForegroundColor Red
    exit 1
}

# --- Check if 'code' command is available ---
if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 'code' command not found. Please add VS Code to PATH." -ForegroundColor Red
    exit 1
}

# --- Check if 'claude' command is available ---
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 'claude' command not found." -ForegroundColor Red
    Write-Host "        Run: npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
    exit 1
}

# --- Launch VS Code ---
Write-Host "[INFO] Opening VS Code..." -ForegroundColor Cyan
code $PROJECT_DIR

# Wait for VS Code to load
Start-Sleep -Seconds 2

# --- Open a new PowerShell window and run claude ---
Write-Host "[INFO] Starting Claude Code CLI in a new terminal..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PROJECT_DIR'; claude"

Write-Host ""
Write-Host "[OK] VS Code and Claude Code CLI launched!" -ForegroundColor Green
Write-Host "[INFO] Claude Code is running in the separate PowerShell window." -ForegroundColor Yellow
Write-Host "[TIP]  In Claude Code, run /ide to link it to your VS Code window." -ForegroundColor Cyan