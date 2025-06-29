# Snowfort Circuit MCP - Computer use for webapps and electron apps

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm](https://img.shields.io/npm/v/@snowfort/circuit-web)](https://www.npmjs.com/package/@snowfort/circuit-web)
[![npm](https://img.shields.io/npm/v/@snowfort/circuit-electron)](https://www.npmjs.com/package/@snowfort/circuit-electron)

Snowfort Circuit MCP is a comprehensive Model Context Protocol (MCP) server suite that enables AI coding agents to automate both web browsers and Electron desktop applications with unparalleled precision and flexibility.

## 🚀 Quick Start for AI Agents

### MCP Configuration

Add to your AI agent's MCP configuration file:

#### **Web Automation Only**
```json
{
  "mcpServers": {
    "circuit-web": {
      "command": "npx",
      "args": ["@snowfort/circuit-web@latest"]
    }
  }
}
```

#### **Desktop Automation Only**
```json
{
  "mcpServers": {
    "circuit-electron": {
      "command": "npx",
      "args": ["@snowfort/circuit-electron@latest"]
    }
  }
}
```

#### **Complete Dual-Engine Setup (Recommended)**
```json
{
  "mcpServers": {
    "circuit-web": {
      "command": "npx",
      "args": ["@snowfort/circuit-web@latest"]
    },
    "circuit-electron": {
      "command": "npx",
      "args": ["@snowfort/circuit-electron@latest"]
    }
  }
}
```

### First Commands

Once configured, your AI agent can immediately start automating:

```javascript
// Launch browser with optimized AI settings
browser_launch({
  "compressScreenshots": true,
  "screenshotQuality": 50
})
browser_navigate({"sessionId": "...", "url": "https://github.com"})
// Auto-snapshot included in response!

// Launch and control any Electron app
app_launch({"app": "/Applications/Visual Studio Code.app"})
click({"sessionId": "...", "selector": "button[title='New File']"})
```

## ✨ Features

### 🌐 **Web Automation (29 Tools)**
- **Cross-Browser Support**: Chromium, Firefox, WebKit
- **🎯 AI-Optimized Snapshots**: Auto-snapshots with element references after every action
- **📸 Smart Screenshot Compression**: JPEG compression for faster AI workflows (configurable)
- **Complete Interaction Set**: Click, type, hover, drag, scroll with auto-context
- **🖱️ Multi-Tab Management**: Create, switch, list, and close browser tabs
- **📊 Network & Console Monitoring**: Real-time request tracking and console capture
- **Advanced Input**: File uploads, dropdown selection, keyboard shortcuts
- **Content Extraction**: HTML content, text content, accessibility trees with element refs
- **Visual Capture**: Compressed screenshots, PDF generation
- **Navigation**: History control, page reload, URL navigation
- **Dialog Handling**: Automatic alert/confirm/prompt management
- **Browser Control**: Viewport resizing, window management
- **🧪 Test Generation**: Auto-generate Playwright test code from recorded actions
- **JavaScript Execution**: Run custom scripts in page context
- **Smart Waiting**: Element appearance, network idle, page load states

### 🖥️ **Desktop Automation (25+ Tools)**
- **🎯 AI-Optimized Desktop Control**: Launches and controls Electron apps with auto-snapshots
- **📸 Smart Screenshot Compression**: JPEG compression for faster AI workflows (configurable)
- **🔧 Development Mode Support**: Launch apps during development with auto-detection
- **Universal Electron Support**: Any Electron application (packaged or development)
- **Multi-Window Management**: Control multiple app windows simultaneously
- **IPC Communication**: Direct inter-process communication with apps
- **Native File System**: Read/write files directly
- **Enhanced Targeting**: Role-based clicks, nth element selection, text-based targeting
- **Accessibility-First**: Built-in accessibility tree navigation with element refs
- **State Management**: Advanced page state waiting and monitoring
- **All Web Tools**: Every web automation tool works in desktop context

### 🔧 **Architecture Benefits**
- **🤖 AI-First Design**: Auto-snapshots, element references, and compressed images for optimal AI workflows
- **Runtime App Selection**: Specify Electron apps at tool call time, not startup
- **Session Management**: Multiple concurrent automation sessions with full isolation
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Robust error reporting and recovery
- **Performance Optimized**: Efficient resource usage and fast execution

## 📚 Complete Tool Reference

### 🌐 Web Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `browser_launch` | Launch browser with AI optimizations | `browser`, `headed`, `viewport`, `compressScreenshots`, `screenshotQuality` |
| `browser_navigate` | Navigate to URL (includes auto-snapshot) | `sessionId`, `url` |
| `browser_resize` | Resize browser viewport | `sessionId`, `width`, `height` |
| `browser_handle_dialog` | Set dialog auto-response | `sessionId`, `action`, `promptText` |
| `browser_tab_new` | Create new browser tab | `sessionId` |
| `browser_tab_list` | List all open tabs | `sessionId` |
| `browser_tab_select` | Switch to specific tab | `sessionId`, `tabId` |
| `browser_tab_close` | Close specific tab | `sessionId`, `tabId` |
| `browser_network_requests` | Get network request history | `sessionId` |
| `browser_console_messages` | Get console message history | `sessionId` |
| `browser_generate_playwright_test` | Generate test code from actions | `sessionId` |
| `click` | Click element (includes auto-snapshot) | `sessionId`, `selector`, `windowId` |
| `type` | Type text (includes auto-snapshot) | `sessionId`, `selector`, `text`, `windowId` |
| `hover` | Hover over element (includes auto-snapshot) | `sessionId`, `selector`, `windowId` |
| `drag` | Drag element to target | `sessionId`, `sourceSelector`, `targetSelector` |
| `key` | Press keyboard key (includes auto-snapshot) | `sessionId`, `key`, `windowId` |
| `select` | Select dropdown option | `sessionId`, `selector`, `value` |
| `upload` | Upload file to input | `sessionId`, `selector`, `filePath` |
| `back` | Navigate back in history | `sessionId` |
| `forward` | Navigate forward in history | `sessionId` |
| `refresh` | Reload current page | `sessionId` |
| `screenshot` | Take compressed screenshot | `sessionId`, `path` |
| `snapshot` | Get accessibility tree with element refs | `sessionId`, `windowId` |
| `snapshot` | Get accessibility tree with element refs | `sessionId` |
| `pdf` | Generate PDF of page | `sessionId`, `path` |
| `content` | Get HTML content | `sessionId` |
| `text_content` | Get visible text | `sessionId` |
| `evaluate` | Execute JavaScript | `sessionId`, `script` |
| `wait_for_selector` | Wait for element | `sessionId`, `selector`, `timeout` |
| `close` | Close browser session | `sessionId` |

### 🖥️ Electron Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `app_launch` | Launch Electron app with AI optimizations | `app`, `mode`, `projectPath`, `startScript`, `disableDevtools`, `compressScreenshots`, `screenshotQuality` |
| `get_windows` | List windows with type identification | `sessionId` |
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
| **+ All Web Tools** | All 29 web tools with optional `windowId` | |

## 💡 Usage Examples

### Web Automation Workflows

#### **AI-Optimized Browser Launch**
```javascript
// Launch with optimal AI settings
const session = await browser_launch({
  "compressScreenshots": true,
  "screenshotQuality": 50,
  "headed": false
})

// Navigation automatically includes page snapshot with element refs
await browser_navigate({
  "sessionId": session.id, 
  "url": "https://github.com"
})
// Response includes auto-snapshot with element references like ref="e1", ref="e2"
```

#### **Multi-Tab Workflow**
```javascript
// Create and manage multiple tabs
const session = await browser_launch({})
await browser_navigate({"sessionId": session.id, "url": "https://github.com"})

const newTabId = await browser_tab_new({"sessionId": session.id})
await browser_tab_select({"sessionId": session.id, "tabId": newTabId})
await browser_navigate({"sessionId": session.id, "url": "https://stackoverflow.com"})

const tabs = await browser_tab_list({"sessionId": session.id})
// Shows all tabs with titles, URLs, and active status
```

#### **Element Targeting with References**
```javascript
// Navigate and get element references
await browser_navigate({"sessionId": session.id, "url": "https://example.com"})
// Auto-snapshot response includes:
// {"role": "button", "name": "Sign In", "ref": "e5"}

// Click using standard selector (auto-snapshot included)
await click({"sessionId": session.id, "selector": "button:has-text('Sign In')"})
// Response includes updated page snapshot showing interaction result
```

#### **Network and Console Monitoring**
```javascript
// Monitor page activity
await browser_navigate({"sessionId": session.id, "url": "https://api-heavy-site.com"})
const requests = await browser_network_requests({"sessionId": session.id})
const consoleMessages = await browser_console_messages({"sessionId": session.id})

// Generate test code from actions
const testCode = await browser_generate_playwright_test({"sessionId": session.id})
```

#### **Dialog Handling**
```javascript
// Set up automatic dialog handling
await browser_handle_dialog({
  "sessionId": session.id,
  "action": "accept",
  "promptText": "Default input"
})
// All subsequent dialogs will be handled automatically
```

### Desktop Application Automation

#### **AI-Optimized Desktop Launch**
```javascript
// Launch with optimal AI settings for packaged apps
const session = await app_launch({
  "app": "/Applications/Visual Studio Code.app",
  "compressScreenshots": true,
  "screenshotQuality": 50
})
// All interactions automatically include window snapshots with element refs!
await click({"sessionId": session.id, "selector": "[title='New File']"})
// Response includes: "Element clicked successfully" + snapshot with ref="e1", ref="e2"
```

#### **Development Mode Support**
```javascript
// NEW: Launch Electron app during development
const session = await app_launch({
  "app": "/Users/dev/my-electron-project",
  "mode": "development",
  "compressScreenshots": false  // Full quality for debugging
})

// Auto-detect packaged vs development
const session2 = await app_launch({
  "app": "/path/to/app-or-project",
  "mode": "auto"  // Automatically detects launch mode
})
```

#### **Electron Forge Support (NEW in v0.5.7)**

**Recommended Approach (Most Reliable):**
```javascript
// 1. First, run in a separate terminal:
// npm run start

// 2. Wait for webpack to compile, then launch with MCP:
const session = await app_launch({
  "app": "/path/to/forge-project",
  "mode": "development"
  // Don't use startScript - let manual npm start handle it
})
// This approach ensures proper timing and reliable launches
```

**Experimental Auto-Start Feature:**
```javascript
// The MCP can attempt to auto-start the dev server (experimental)
const session = await app_launch({
  "app": "/path/to/forge-project",
  "mode": "development",
  "startScript": "start"  // Attempts to run 'npm run start' automatically
})
// Features: 30s timeout, progress updates every 5s, enhanced Forge pattern detection
// Note: If you experience problems, use the manual approach above
```

## 🚀 Quick Start Guide for Electron Automation

*Use this guide for AI agents (CLAUDE.md) or manual reference*

### **For Electron Forge Projects:**
```bash
# Step 1: In terminal, start your dev server first
npm run start

# Step 2: Once webpack compiles, use the MCP to launch
await app_launch({
  "app": "/path/to/your/project",
  "mode": "development"
})
```

### **For Regular Electron Projects:**
```javascript
// Just launch directly - no prep needed!
await app_launch({
  "app": "/path/to/project",
  "mode": "development",
  "disableDevtools": true  // Optional: prevent DevTools auto-opening
})
```

### **For Packaged Apps:**
```javascript
// Launch .app, .exe, or AppImage files
await app_launch({
  "app": "/Applications/YourApp.app"
})
```

### **Key Features:**
- 📸 **Every action returns an AI-ready snapshot** with element refs (e1, e2, etc.)
- 🎯 **Multiple click methods**: by selector, text, role, or nth element
- 🔧 **Full automation**: screenshots, evaluate JS, keyboard/mouse control
- 🧹 **Auto cleanup**: Sessions and dev servers close automatically
- 🪟 **Smart window management**: DevTools automatically filtered, main window detection

### **Pro Tips:**
- Use `compressScreenshots: true` (default) for faster AI processing
- The MCP launches a **new instance** - it cannot attach to running apps
- For Electron Forge: Always start dev server first, then launch with MCP
- **DevTools windows are automatically filtered out** - you'll always get the main app window
- Use `disableDevtools: true` to prevent DevTools from opening automatically
- Use `get_windows` to see all windows with type identification (main/devtools/other)

**That's it!** All other tools work just like the web version. Happy automating! 🎉

#### **📖 Legacy Instructions for AI Agents (Claude, CLAUDE.md, etc.)**

**⚠️ Important:** The MCP launches its own Electron instance - you cannot connect to an already running app.

**For Electron development projects:**
1. **Stop any existing `npm run start` process**
2. **Let the MCP launch your app instead:**

```javascript
const session = await app_launch({
  "app": "/path/to/your/electron/project",
  "mode": "development"
})
// Returns sessionId automatically - use this for all subsequent commands
```

**How It Works:**
- 🚀 **Launches new instance** of your Electron app using Playwright
- 🎯 **Full automation control** via Chrome DevTools Protocol
- 📸 **Cannot attach** to existing running processes

**Key Benefits for AI Workflows:**
- 🤖 **Auto-snapshots** after every action with element references (`ref="e1"`, `ref="e2"`)
- 📸 **Compressed screenshots** by default for faster processing  
- 🎯 **Direct element targeting** using the provided refs in snapshots
- 🔄 **No manual snapshot calls needed** - context is provided automatically

#### **Code Editor Automation**
```javascript
// Traditional packaged app automation
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

### Advanced Configuration

#### **Web Development Mode with Full Quality**
```javascript
// Launch browser with uncompressed screenshots for debugging
const session = await browser_launch({
  "compressScreenshots": false,  // Full PNG quality
  "headed": true,                // Visible browser
  "viewport": {"width": 1920, "height": 1080}
})
```

#### **Electron Development Mode**
```javascript
// Launch Electron app during development with full quality
const session = await app_launch({
  "app": "/Users/dev/my-electron-project",
  "mode": "development",
  "compressScreenshots": false  // Full PNG quality for debugging
})
```

#### **Production Mode with Optimized Performance**
```javascript
// Web: Launch with maximum compression for speed
const webSession = await browser_launch({
  "compressScreenshots": true,
  "screenshotQuality": 30,      // Maximum compression
  "headed": false               // Headless for performance
})

// Electron: Launch packaged app with compression
const electronSession = await app_launch({
  "app": "/Applications/MyApp.app",
  "compressScreenshots": true,
  "screenshotQuality": 30       // Maximum compression
})
```

## 🔧 Troubleshooting

### Common Electron Development Issues

#### **"Not connected" Error**
**Problem:** Trying to use MCP commands without a valid session

**Solution:**
```javascript
// ❌ Wrong - no session exists
get_windows({"sessionId": "test"})

// ✅ Correct - launch first, then use returned sessionId
const session = await app_launch({"app": "/path/to/project", "mode": "development"})
get_windows({"sessionId": session.id})
```

#### **Cannot Connect to Running App**
**Problem:** Trying to connect to existing `npm run start` process

**Solution:** Stop existing process, let MCP launch your app instead
```bash
# Stop existing process
kill $(ps aux | grep 'Electron .' | awk '{print $2}')

# Let MCP launch instead
app_launch({"app": "/your/project", "mode": "development"})
```

#### **Electron Not Found**
**Problem:** MCP can't find Electron executable

**Solutions:**
1. Install Electron locally: `npm install electron --save-dev`
2. Specify custom path: `{"electronPath": "/custom/path/to/electron"}`
3. Install globally: `npm install -g electron`

## 🛠️ Configuration Options

### CLI Options

#### Web Server (`@snowfort/circuit-web`)
```bash
npx @snowfort/circuit-web@latest [options]

Options:
  --browser <type>    Browser engine: chromium, firefox, webkit (default: chromium)
  --headed           Run in headed mode (default: headless)
  --name <name>      Server name for MCP handshake (default: circuit-web)
```

#### Electron Server (`@snowfort/circuit-electron`)
```bash
npx @snowfort/circuit-electron@latest [options]

Options:
  --name <name>      Server name for MCP handshake (default: circuit-electron)
```

### Advanced MCP Configurations

#### **Development Setup**
```json
{
  "mcpServers": {
    "circuit-web": {
      "command": "npx",
      "args": ["@snowfort/circuit-web@latest", "--headed", "--browser", "chromium"]
    },
    "circuit-electron": {
      "command": "npx",
      "args": ["@snowfort/circuit-electron@latest"]
    }
  }
}
```

#### **Production Setup**
```json
{
  "mcpServers": {
    "circuit-web": {
      "command": "npx",
      "args": ["@snowfort/circuit-web@latest"]
    },
    "circuit-electron": {
      "command": "npx",
      "args": ["@snowfort/circuit-electron@latest"]
    }
  }
}
```

## 🏗️ Architecture

```
Published Packages:
├── @snowfort/circuit-core@latest      # Core MCP infrastructure
├── @snowfort/circuit-web@latest       # Web automation server (29 tools)
└── @snowfort/circuit-electron@latest  # Desktop automation server (25+ tools)

Local Development:
packages/
├── core/          # Shared MCP infrastructure & Driver interface
├── web/           # Web automation CLI with AI optimizations
└── electron/      # Desktop automation CLI
```

## 📦 Published Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@snowfort/circuit-core`](https://www.npmjs.com/package/@snowfort/circuit-core) | ![npm](https://img.shields.io/npm/v/@snowfort/circuit-core) | Core MCP infrastructure |
| [`@snowfort/circuit-web`](https://www.npmjs.com/package/@snowfort/circuit-web) | ![npm](https://img.shields.io/npm/v/@snowfort/circuit-web) | Web automation CLI (29 tools) |
| [`@snowfort/circuit-electron`](https://www.npmjs.com/package/@snowfort/circuit-electron) | ![npm](https://img.shields.io/npm/v/@snowfort/circuit-electron) | Desktop automation CLI (25+ tools) |

## 🔧 Development

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/snowfort-ai/circuit-mcp.git
cd circuit-mcp

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

**Ready to automate everything?** Start with the MCP configuration above and unleash the power of AI-optimized dual-engine automation! 🚀