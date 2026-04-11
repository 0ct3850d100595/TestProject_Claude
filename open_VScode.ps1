param(
    [string]$Path = (Get-Location).Path
)

# Check if folder exists
if (-not (Test-Path $Path)) {
    Write-Error "Error: Folder not found: $Path"
    exit 1
}

# Launch VSCode in the target folder
Write-Host "Opening VSCode: $Path"
code $Path
