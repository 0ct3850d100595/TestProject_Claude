# =========================================
# Launch VS Code + Claude Code
# Usage: .\launch_claude.ps1
# =========================================

# *** Change this to your project folder ***
$PROJECT_DIR = "D:\TestProject_Claude"

# Check if folder exists
if (-not (Test-Path $PROJECT_DIR)) {
    Write-Host "[ERROR] Folder not found: $PROJECT_DIR" -ForegroundColor Red
    exit 1
}

# Launch VS Code
Write-Host "[INFO] Opening VS Code..." -ForegroundColor Cyan
code $PROJECT_DIR

Write-Host ""
Write-Host "[OK] VS Code launched!" -ForegroundColor Green
Write-Host "[NEXT] Open terminal in VS Code (Ctrl+@) and type: claude" -ForegroundColor Yellow