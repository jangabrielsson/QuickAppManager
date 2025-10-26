# HC3 QuickApp Manager - Copilot Instructions

## Project Overview
Desktop application built with Tauri 2.x for managing Fibaro HC3 QuickApps.

## Technology Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Rust (Tauri 2.x)
- **Plugins**: tauri-plugin-updater, tauri-plugin-dialog, tauri-plugin-process
- **Build**: GitHub Actions for macOS (aarch64/x86_64) and Windows releases

## Key Features Based on EventLogger Learnings
- Auto-updater with minisign cryptographic signing
- DevTools support for debugging
- Native dialogs for user interaction
- Proper ACL permissions configuration
- .env file support for HC3 credentials
- CSP configuration for IPC protocol

## Progress Checklist
- [x] Create .github/copilot-instructions.md
- [x] Get project setup information
- [x] Scaffold Tauri project structure
- [x] Customize for HC3 QuickApp Manager
- [x] Install required extensions
- [x] Compile the project
- [x] Create documentation

## Documentation

Comprehensive guides available in `docs/`:
- **UPDATER_SETUP.md** - Auto-updater with cryptographic signing
- **DEV_GUIDE.md** - Development workflow
- **CODESIGNING.md** - macOS code signing
- **README.md** - Documentation index

## Next Steps

1. Generate minisign keys (see docs/UPDATER_SETUP.md Part 2)
2. Configure GitHub repository and secrets
3. Create GitHub Actions workflow
4. Test auto-update functionality
