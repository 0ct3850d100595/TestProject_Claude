# =========================================
# Launch VS Code + Claude Code (Extension method)
# - Opens VS Code in the project folder
# - Auto-installs the Claude Code extension if not installed
# - You open the Claude Code panel manually via the sidebar icon
#
# Usage: .\launch_claude_extension.ps1
# =========================================

# *** Change this to your project folder ***
$PROJECT_DIR = "D:\TestProject_Claude"

# Claude Code extension ID on VS Code Marketplace
$EXTENSION_ID = "anthropic.claude-code"

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

# --- Install extension if not already installed ---
Write-Host "[INFO] Checking Claude Code extension..." -ForegroundColor Cyan
$installed = code --list-extensions 2>$null | Where-Object { $_ -eq $EXTENSION_ID }

if (-not $installed) {
    Write-Host "[INFO] Installing Claude Code extension..." -ForegroundColor Yellow
    code --install-extension $EXTENSION_ID
    Write-Host "[OK] Extension installed." -ForegroundColor Green
} else {
    Write-Host "[OK] Claude Code extension is already installed." -ForegroundColor Green
}

# --- Launch VS Code ---
Write-Host "[INFO] Opening VS Code..." -ForegroundColor Cyan
code $PROJECT_DIR

Write-Host ""
Write-Host "[OK] VS Code launched!" -ForegroundColor Green
Write-Host "[NEXT] Click the Claude Code icon in the left sidebar to open the panel." -ForegroundColor Yellow