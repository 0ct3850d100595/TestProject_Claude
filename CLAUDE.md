# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a launcher/utility project containing scripts to open VS Code with Claude Code integration. It is not a software application — there is no build system, test suite, or package manager.

## Launch Scripts

### Claude Code launchers (hardcoded to `$PROJECT_DIR`)

| Script | Method | Notes |
|--------|--------|-------|
| `launch_claude.ps1` | Basic — opens VS Code only | Run `claude` manually in VS Code terminal |
| `launch_claude_cli.ps1` | CLI — opens VS Code + separate PowerShell running `claude` | After launch, run `/ide` in Claude to link it to VS Code |
| `launch_claude_extension.ps1` | Extension — opens VS Code, auto-installs `anthropic.claude-code` extension | Open Claude via the sidebar icon |

All three scripts default `$PROJECT_DIR` to `D:\TestProject_Claude`. Update that variable when adapting a script for a different project.

Distributable copies of the CLI and Extension scripts are archived in `files.zip`.

### Generic VS Code launchers (accept a path argument)

| Script | Usage |
|--------|-------|
| `open_VScode.ps1` | `.\open_VScode.ps1 [-Path <dir>]` — defaults to current directory |
| `open_VScode.bat` | `open_VScode.bat [dir]` — defaults to current directory |

These do not start Claude Code; they just open VS Code in the given folder.

## Prerequisites

- VS Code with `code` on PATH
- Claude Code CLI: `npm install -g @anthropic-ai/claude-code`