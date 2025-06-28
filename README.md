# Snowfort Choreograph MCP - Dual-Engine Automation Suite

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm](https://img.shields.io/npm/v/sfcg-mcp-web)](https://www.npmjs.com/package/sfcg-mcp-web)
[![npm](https://img.shields.io/npm/v/sfcg-mcp-electron)](https://www.npmjs.com/package/sfcg-mcp-electron)

Snowfort Choreograph MCP is a comprehensive Model Context Protocol (MCP) server suite that enables AI coding agents to automate both web browsers and Electron desktop applications with unparalleled precision and flexibility.

## 🚀 Quick Start for AI Agents

### MCP Configuration

Add to your AI agent's MCP configuration file:

#### **Web Automation Only**
```json
{
  "mcpServers": {
    "sfcg-web": {
      "command": "npx",
      "args": ["sfcg-mcp-web@latest"]
    }
  }
}
```

#### **Desktop Automation Only**
```json
{
  "mcpServers": {
    "sfcg-electron": {
      "command": "npx",
      "args": ["sfcg-mcp-electron@latest"]
    }
  }
}
```

#### **Complete Dual-Engine Setup (Recommended)**
```json
{
  "mcpServers": {
    "sfcg-web": {
      "command": "npx",
      "args": ["sfcg-mcp-web@latest"]
    },
    "sfcg-electron": {
      "command": "npx",
      "args": ["sfcg-mcp-electron@latest"]
    }
  }
}
```

### First Commands

Once configured, your AI agent can immediately start automating:

```javascript
// Take a screenshot of any website
browser_launch({})
browser_navigate({"sessionId": "...", "url": "https://github.com"})
screenshot({"sessionId": "..."})

// Launch and control any Electron app
app_launch({"app": "/Applications/Visual Studio Code.app"})
click({"sessionId": "...", "selector": "button[title='New File']"})
```

## ✨ Features

### 🌐 **Web Automation (19 Tools)**
- **Cross-Browser Support**: Chromium, Firefox, WebKit
- **Complete Interaction Set**: Click, type, hover, drag, scroll
- **Advanced Input**: File uploads, dropdown selection, keyboard shortcuts
- **Content Extraction**: HTML content, text content, accessibility trees
- **Visual Capture**: Screenshots, PDF generation
- **Navigation**: History control, page reload, URL navigation
- **JavaScript Execution**: Run custom scripts in page context
- **Smart Waiting**: Element appearance, network idle, page load states

### 🖥️ **Desktop Automation (22+ Tools)**
- **Universal Electron Support**: Any Electron application
- **Multi-Window Management**: Control multiple app windows simultaneously
- **IPC Communication**: Direct inter-process communication with apps
- **Native File System**: Read/write files directly
- **Enhanced Targeting**: Role-based clicks, nth element selection, text-based targeting
- **Accessibility-First**: Built-in accessibility tree navigation
- **State Management**: Advanced page state waiting and monitoring
- **All Web Tools**: Every web automation tool works in desktop context

### 🔧 **Architecture Benefits**
- **Runtime App Selection**: Specify Electron apps at tool call time, not startup
- **Session Management**: Multiple concurrent automation sessions
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Robust error reporting and recovery
- **Performance Optimized**: Efficient resource usage and fast execution

## 📚 Complete Tool Reference

### 🌐 Web Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `browser_launch` | Launch a new browser session | `browser`, `headed`, `viewport` |
| `browser_navigate` | Navigate to a URL | `sessionId`, `url` |
| `click` | Click on an element | `sessionId`, `selector` |
| `type` | Type text into an element | `sessionId`, `selector`, `text` |
| `hover` | Hover over an element | `sessionId`, `selector` |
| `drag` | Drag element to target | `sessionId`, `sourceSelector`, `targetSelector` |
| `key` | Press keyboard key | `sessionId`, `key` |
| `select` | Select dropdown option | `sessionId`, `selector`, `value` |
| `upload` | Upload file to input | `sessionId`, `selector`, `filePath` |
| `back` | Navigate back in history | `sessionId` |
| `forward` | Navigate forward in history | `sessionId` |
| `refresh` | Reload current page | `sessionId` |
| `screenshot` | Take page screenshot | `sessionId`, `path` |
| `snapshot` | Get accessibility tree | `sessionId` |
| `pdf` | Generate PDF of page | `sessionId`, `path` |
| `content` | Get HTML content | `sessionId` |
| `text_content` | Get visible text | `sessionId` |
| `evaluate` | Execute JavaScript | `sessionId`, `script` |
| `wait_for_selector` | Wait for element | `sessionId`, `selector`, `timeout` |

### 🖥️ Electron Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `app_launch` | Launch Electron application | `app`, `args`, `env`, `cwd` |
| `get_windows` | List application windows | `sessionId` |
| `ipc_invoke` | Call IPC method | `sessionId`, `channel`, `args` |
| `fs_write_file` | Write file to disk | `sessionId`, `filePath`, `content` |
| `fs_read_file` | Read file from disk | `sessionId`, `filePath` |
| `keyboard_press` | Press key with modifiers | `sessionId`, `key`, `modifiers` |
| `click_by_text` | Click element by text | `sessionId`, `text`, `exact` |
| `click_by_role` | Click by accessibility role | `sessionId`, `role`, `name` |
| `click_nth` | Click nth matching element | `sessionId`, `selector`, `index` |
| `keyboard_type` | Type with delay | `sessionId`, `text`, `delay` |
| `add_locator_handler` | Handle modals/popups | `sessionId`, `selector`, `action` |
| `wait_for_load_state` | Wait for page state | `sessionId`, `state` |
| **+ All Web Tools** | All 19 web tools with optional `windowId` | |

## 💡 Usage Examples

### Web Automation Workflows

#### **Website Testing**
```javascript
// Launch browser and test a form
const session = await browser_launch({"headed": true})
await browser_navigate({"sessionId": session.id, "url": "https://example.com/form"})
await type({"sessionId": session.id, "selector": "#name", "text": "John Doe"})
await type({"sessionId": session.id, "selector": "#email", "text": "john@example.com"})
await click({"sessionId": session.id, "selector": "button[type='submit']"})
await wait_for_selector({"sessionId": session.id, "selector": ".success-message"})
const screenshot_path = await screenshot({"sessionId": session.id})
```

#### **Content Extraction**
```javascript
// Extract content from a webpage
const session = await browser_launch({})
await browser_navigate({"sessionId": session.id, "url": "https://news.ycombinator.com"})
const accessibility_tree = await snapshot({"sessionId": session.id})
const html_content = await content({"sessionId": session.id})
const text_only = await text_content({"sessionId": session.id})
```

### Desktop Application Automation

#### **Code Editor Automation**
```javascript
// Automate Visual Studio Code
const session = await app_launch({"app": "/Applications/Visual Studio Code.app"})
await click({"sessionId": session.id, "selector": "[title='New File']"})
await keyboard_type({"sessionId": session.id, "text": "console.log('Hello World');", "delay": 50})
await keyboard_press({"sessionId": session.id, "key": "s", "modifiers": ["ControlOrMeta"]})
```

#### **Multi-Window Management**
```javascript
// Work with multiple windows
const session = await app_launch({"app": "/Applications/Slack.app"})
const windows = await get_windows({"sessionId": session.id})
await click({"sessionId": session.id, "selector": ".channel-name", "windowId": "main"})
await type({"sessionId": session.id, "selector": "[data-qa='message-input']", "text": "Hello team!", "windowId": "main"})
```

#### **IPC Communication**
```javascript
// Direct communication with Electron app
const result = await ipc_invoke({
  "sessionId": session.id,
  "channel": "get-app-config",
  "args": ["production"]
})
```

### Advanced Automation Patterns

#### **Smart Element Targeting**
```javascript
// Multiple ways to target elements
await click_by_role({"sessionId": session.id, "role": "button", "name": "Submit"})
await click_by_text({"sessionId": session.id, "text": "Sign In", "exact": true})
await click_nth({"sessionId": session.id, "selector": ".item", "index": 2})
```

#### **Robust Error Handling**
```javascript
// Handle modals and popups automatically
await add_locator_handler({
  "sessionId": session.id,
  "selector": "[role='dialog']",
  "action": "dismiss"
})

// Wait for specific states
await wait_for_load_state({"sessionId": session.id, "state": "networkidle"})
```

## 🛠️ Configuration Options

### CLI Options

#### Web Server (`sfcg-mcp-web`)
```bash
npx sfcg-mcp-web@latest [options]

Options:
  --browser <type>    Browser engine: chromium, firefox, webkit (default: chromium)
  --headed           Run in headed mode (default: headless)
  --name <name>      Server name for MCP handshake (default: sfcg-web)
```

#### Electron Server (`sfcg-mcp-electron`)
```bash
npx sfcg-mcp-electron@latest [options]

Options:
  --name <name>      Server name for MCP handshake (default: sfcg-electron)
```

### Advanced MCP Configurations

#### **Development Setup**
```json
{
  "mcpServers": {
    "sfcg-web": {
      "command": "npx",
      "args": ["sfcg-mcp-web@latest", "--headed", "--browser", "chromium"]
    },
    "sfcg-electron": {
      "command": "npx",
      "args": ["sfcg-mcp-electron@latest"]
    }
  }
}
```

#### **Production Setup**
```json
{
  "mcpServers": {
    "sfcg-web": {
      "command": "npx",
      "args": ["sfcg-mcp-web@latest"]
    },
    "sfcg-electron": {
      "command": "npx",
      "args": ["sfcg-mcp-electron@latest"]
    }
  }
}
```

## 🏗️ Architecture

```
Published Packages:
├── sfcg-mcp-core@latest      # Core MCP infrastructure
├── sfcg-mcp-web@latest       # Web automation server
└── sfcg-mcp-electron@latest  # Desktop automation server

Local Development:
packages/
├── core/          # Shared MCP infrastructure & Driver interface
├── web/           # Web automation CLI (chromium default)
└── electron/      # Desktop automation CLI
```

## 🔧 Development

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/snowfort-ai/choreograph-mcp.git
cd choreograph-mcp

# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Watch mode development
pnpm -r dev
```

### Running Local Development Servers

```bash
# Web automation server
./packages/web/dist/esm/cli.js --headed

# Desktop automation server  
./packages/electron/dist/esm/cli.js
```

### Testing

```bash
# Run all tests
pnpm -r test

# Clean all builds
pnpm -r clean
```

## 📦 Published Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`sfcg-mcp-core`](https://www.npmjs.com/package/sfcg-mcp-core) | ![npm](https://img.shields.io/npm/v/sfcg-mcp-core) | Core MCP infrastructure |
| [`sfcg-mcp-web`](https://www.npmjs.com/package/sfcg-mcp-web) | ![npm](https://img.shields.io/npm/v/sfcg-mcp-web) | Web automation CLI |
| [`sfcg-mcp-electron`](https://www.npmjs.com/package/sfcg-mcp-electron) | ![npm](https://img.shields.io/npm/v/sfcg-mcp-electron) | Desktop automation CLI |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

Independent implementation for comprehensive automation testing - © 2025 Snowfort LLC

## 🙏 Acknowledgments

- [Playwright](https://playwright.dev/) for the automation framework
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) for the protocol implementation
- The Model Context Protocol community for driving innovation in AI-tool integration

---

**Ready to automate everything?** Start with the MCP configuration above and unleash the power of dual-engine automation! 🚀