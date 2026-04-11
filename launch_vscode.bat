@echo off
:: =========================================
:: Claude Code × VS Code 一発起動バッチ
:: （拡張機能方式）
:: =========================================

:: 開くフォルダをここに設定（ドットは「現在のフォルダ」）
set PROJECT_DIR=C:\Users\YourName\Projects\MyProject

:: VS Codeでプロジェクトを開く
code "%PROJECT_DIR%"

:: VS Codeが起動するまで少し待つ
timeout /t 3 /nobreak > nul

:: Claude Codeサイドバーを開くコマンドを送信
code --command claude-vscode.sidebar.open

echo VS Code + Claude Code を起動しました！
pause