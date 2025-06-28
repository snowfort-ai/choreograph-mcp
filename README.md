# Snowfort Choreograph MCP - Dual-Engine MCP Server Suite

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Snowfort Choreograph MCP is a dual-engine Model Context Protocol (MCP) server suite that enables AI coding agents (e.g., Claude Code) to drive both web browsers and Electron desktop applications using Playwright.

## Features

- **Web Automation**: Control Chromium, Firefox, and WebKit browsers
- **Desktop Automation**: Automate Electron applications with native features
- **MCP Protocol**: Full integration with the Model Context Protocol
- **Dual Engines**: Separate tools for web vs. desktop contexts
- **TypeScript**: Full type safety with ESM + CJS builds

## Architecture

```
packages/
├── core/          # @sfcg/core - Shared MCP infrastructure & Driver interface
├── web/           # @sfcg/web - Web automation CLI (chromium default)
└── electron/      # @sfcg/electron - Electron automation CLI
```

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build
```

### Web Automation

```bash
# Launch web automation server
./packages/web/dist/esm/cli.js --headed --name sfcg-web
```

**Available tools:**
- `browser_launch` - Launch browser session
- `browser_navigate` - Navigate to URL  
- `click`, `type`, `hover`, `drag` - Element interactions
- `key`, `select`, `upload` - Input controls
- `back`, `forward`, `refresh` - Navigation
- `screenshot`, `snapshot`, `pdf` - Capture tools
- `content`, `text_content` - Content extraction
- `evaluate` - Execute JavaScript
- `wait_for_selector` - Wait for elements
- `close` - Close session

### Electron Automation

```bash
# Launch electron automation server (requires Electron app)
./packages/electron/dist/esm/cli.js --app ./dist/MyApp --name sfcg-electron
```

**Additional tools:**
- `app_launch` - Launch Electron application
- `ipc_invoke` - Invoke IPC methods
- `get_windows` - List application windows
- `fs_write_file`, `fs_read_file` - File system operations
- `keyboard_press`, `click_by_text`, `add_locator_handler` - Enhanced interactions
- `click_by_role`, `click_nth`, `keyboard_type` - Advanced targeting
- `wait_for_load_state` - State management
- All web tools with optional `windowId` parameter

## Usage Examples

### Web Browser Control

```bash
# Launch server
sfcg-web --headed

# Then use MCP tools:
# browser_launch {"browser": "chromium", "headed": true}
# browser_navigate {"sessionId": "...", "url": "https://example.com"}
# click {"sessionId": "...", "selector": "button"}
```

### Electron Application Control

```bash
# Launch server with your Electron app
sfcg-electron --app ./dist/MyElectronApp

# Then use MCP tools:
# app_launch {"app": "./dist/MyElectronApp"}
# click {"sessionId": "...", "selector": "button", "windowId": "main"}
# ipc_invoke {"sessionId": "...", "channel": "my-channel", "args": []}
```

## Development

```bash
# Install dependencies
pnpm install

# Watch mode development
pnpm -r dev

# Build all packages
pnpm -r build

# Clean all packages
pnpm -r clean
```

## API Reference

### Core Driver Interface

```typescript
interface Driver {
  launch(opts: LaunchOpts): Promise<Session>;
  navigate?(session: Session, url: string): Promise<void>;
  click(session: Session, selector: string): Promise<void>;
  // ... additional methods
}
```

### Web-Specific Options

```typescript
interface WebLaunchOpts extends LaunchOpts {
  browser?: "chromium" | "firefox" | "webkit";
  headed?: boolean;
  viewport?: { width: number; height: number };
}
```

### Electron-Specific Options

```typescript
interface ElectronLaunchOpts extends LaunchOpts {
  app: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

Independent implementation for comprehensive automation testing - © 2025 Snowfort LLC

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [Playwright](https://playwright.dev/) for the automation framework
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) for the protocol implementation
- [Playwright](https://playwright.dev/) for the automation framework
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) for the protocol implementation