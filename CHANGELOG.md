# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-06-28

### Added
- Initial release of Snowfort Choreograph MCP server
- `@sfcg/core` package with shared MCP infrastructure and Driver interface
- `@sfcg/web` package for web browser automation via Playwright
- `@sfcg/electron` package for Electron desktop application automation
- Support for Chromium, Firefox, and WebKit browsers
- Electron-specific features: IPC communication, window management, file system operations
- Complete MCP protocol implementation with proper tool schemas
- TypeScript support with both ESM and CJS builds
- Monorepo structure with pnpm workspaces
- Apache 2.0 license compliance with proper attributions
- CLI commands: `sfcg-web` and `sfcg-electron`

### Features
- **Web Tools**: browser_launch, browser_navigate, click, type, screenshot, evaluate, wait_for_selector, close
- **Electron Tools**: app_launch, ipc_invoke, get_windows, fs_write_file, fs_read_file, plus all web tools with windowId support
- **Shared Infrastructure**: Session management, error handling, type-safe tool schemas
- **Multi-platform**: Support for Linux, macOS, and Windows

### Developer Experience
- Comprehensive TypeScript types
- Hot-reload development with watch mode
- Clean build system with separate ESM/CJS outputs
- Proper workspace dependency management