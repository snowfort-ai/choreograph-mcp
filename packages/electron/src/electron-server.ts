import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Session, ToolResult } from "@snowfort/circuit-core";
import { ElectronDriver, ElectronLaunchOpts, ElectronSession } from "./electron-driver.js";

export class ElectronMCPServer {
  private server: Server;
  private driver: ElectronDriver;
  private sessions = new Map<string, Session>();

  constructor(private name: string, private version: string = "0.1.0") {
    this.driver = new ElectronDriver();
    this.server = new Server(
      {
        name: this.name,
        version: this.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "app_launch",
            description: "Launch new Electron app instance. For Electron Forge projects, use startScript to auto-start webpack dev server",
            inputSchema: {
              type: "object",
              properties: {
                app: {
                  type: "string",
                  description: "Path to app executable or project directory (launches new instance)",
                },
                args: {
                  type: "array",
                  items: { type: "string" },
                  description: "Command line arguments for the application",
                },
                env: {
                  type: "object",
                  description: "Environment variables",
                },
                cwd: {
                  type: "string",
                  description: "Working directory",
                },
                timeout: {
                  type: "number",
                  description: "Launch timeout in milliseconds",
                },
                mode: {
                  type: "string",
                  enum: ["auto", "development", "packaged"],
                  description: "Launch mode: auto-detect, development, or packaged (default: auto)",
                },
                projectPath: {
                  type: "string",
                  description: "Project directory for development mode",
                },
                startScript: {
                  type: "string",
                  description: "npm script to run before launching (e.g., 'start' for Electron Forge). Enhanced detection for Forge patterns, 30s timeout with progress updates",
                },
                electronPath: {
                  type: "string",
                  description: "Custom path to electron executable",
                },
                compressScreenshots: {
                  type: "boolean",
                  description: "Compress screenshots to JPEG (default: true)",
                },
                screenshotQuality: {
                  type: "number",
                  description: "JPEG quality 1-100 (default: 50)",
                },
                disableDevtools: {
                  type: "boolean",
                  description: "Prevent DevTools from opening automatically (default: false)",
                },
                killPortConflicts: {
                  type: "boolean",
                  description: "Automatically kill processes on conflicting ports and retry (default: true)",
                },
                includeSnapshots: {
                  type: "boolean",
                  description: "Include window snapshots in action responses (default: false for minimal context)",
                },
                windowTimeout: {
                  type: "number",
                  description: "Timeout for window detection in milliseconds (default: 60000)",
                },
              },
              required: ["app"],
            },
          },
          {
            name: "click",
            description: "Click element (snapshot included if includeSnapshots=true)",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the element to click",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "selector"],
            },
          },
          {
            name: "type",
            description: "Type text into element (snapshot included if includeSnapshots=true)",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the element to type into",
                },
                text: {
                  type: "string",
                  description: "Text to type",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "selector", "text"],
            },
          },
          {
            name: "screenshot",
            description: "Take a compressed screenshot of the current window",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                path: {
                  type: "string",
                  description: "Optional path to save the screenshot",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "evaluate",
            description: "Execute JavaScript in the application context",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                script: {
                  type: "string",
                  description: "JavaScript code to execute",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "script"],
            },
          },
          {
            name: "wait_for_selector",
            description: "Wait for an element to appear in the application",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector to wait for",
                },
                timeout: {
                  type: "number",
                  description: "Timeout in milliseconds (default: 30000)",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "selector"],
            },
          },
          {
            name: "ipc_invoke",
            description: "Invoke an IPC method in the Electron application",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                channel: {
                  type: "string",
                  description: "IPC channel name",
                },
                args: {
                  type: "array",
                  description: "Arguments to pass to the IPC method",
                },
              },
              required: ["sessionId", "channel"],
            },
          },
          {
            name: "get_windows",
            description: "List windows with type identification (main/devtools/other) and titles",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "fs_write_file",
            description: "Write content to a file",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID",
                },
                filePath: {
                  type: "string",
                  description: "Path to the file",
                },
                content: {
                  type: "string",
                  description: "Content to write",
                },
              },
              required: ["sessionId", "filePath", "content"],
            },
          },
          {
            name: "fs_read_file",
            description: "Read content from a file",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID",
                },
                filePath: {
                  type: "string",
                  description: "Path to the file",
                },
              },
              required: ["sessionId", "filePath"],
            },
          },
          {
            name: "close",
            description: "Close session and terminate launched Electron app",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID to close",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "keyboard_press",
            description: "Press a key or key combination",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                key: {
                  type: "string",
                  description: "Key to press (e.g., 'Enter', 'Tab', 'Escape', 'c')",
                },
                modifiers: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional modifier keys (e.g., ['ControlOrMeta'], ['Alt', 'Shift'])",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "key"],
            },
          },
          {
            name: "click_by_text",
            description: "Click on an element containing specific text",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                text: {
                  type: "string",
                  description: "Text to search for in elements",
                },
                exact: {
                  type: "boolean",
                  description: "Whether to match text exactly (default: false)",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "text"],
            },
          },
          {
            name: "add_locator_handler",
            description: "Add automatic handler for modals/overlays",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the modal/overlay to handle",
                },
                action: {
                  type: "string",
                  enum: ["dismiss", "accept", "click"],
                  description: "Action to take when modal appears",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "selector", "action"],
            },
          },
          {
            name: "click_by_role",
            description: "Click on an element by its accessibility role",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                role: {
                  type: "string",
                  description: "Accessibility role (e.g., 'button', 'link', 'tab', 'textbox')",
                },
                name: {
                  type: "string",
                  description: "Optional accessible name to filter by",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "role"],
            },
          },
          {
            name: "click_nth",
            description: "Click on the nth element matching a selector",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the elements",
                },
                index: {
                  type: "number",
                  description: "Zero-based index of the element to click",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "selector", "index"],
            },
          },
          {
            name: "keyboard_type",
            description: "Type text using keyboard events with optional delay",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                text: {
                  type: "string",
                  description: "Text to type",
                },
                delay: {
                  type: "number",
                  description: "Optional delay between keystrokes in milliseconds",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "text"],
            },
          },
          {
            name: "wait_for_load_state",
            description: "Wait for the page to reach a specific load state",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                state: {
                  type: "string",
                  enum: ["load", "domcontentloaded", "networkidle"],
                  description: "Load state to wait for. 'load' (default) - page finished loading, 'domcontentloaded' - DOM parsed, 'networkidle' - no network requests for 500ms (may timeout in apps with persistent connections)",
                },
                timeout: {
                  type: "number",
                  description: "Timeout in milliseconds (default: 30000 for load/domcontentloaded, 10000 for networkidle)",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "snapshot",
            description: "Get accessibility tree snapshot with element references for AI targeting",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "hover",
            description: "Hover over an element identified by a CSS selector",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the element to hover over",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "selector"],
            },
          },
          {
            name: "drag",
            description: "Drag an element to a target location",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                sourceSelector: {
                  type: "string",
                  description: "CSS selector for the element to drag",
                },
                targetSelector: {
                  type: "string",
                  description: "CSS selector for the drop target",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "sourceSelector", "targetSelector"],
            },
          },
          {
            name: "key",
            description: "Press a keyboard key",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                key: {
                  type: "string",
                  description: "Key to press (e.g., 'Enter', 'Tab', 'Escape')",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "key"],
            },
          },
          {
            name: "select",
            description: "Select an option from a dropdown",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the select element",
                },
                value: {
                  type: "string",
                  description: "Value to select",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "selector", "value"],
            },
          },
          {
            name: "upload",
            description: "Upload a file to an input element",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the file input element",
                },
                filePath: {
                  type: "string",
                  description: "Path to the file to upload",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "selector", "filePath"],
            },
          },
          {
            name: "back",
            description: "Navigate back in window history",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "forward",
            description: "Navigate forward in window history",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "refresh",
            description: "Refresh the current window",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "content",
            description: "Get the HTML content of the current window",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "text_content",
            description: "Get the visible text content of the current window",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "smart_click",
            description: "Smart click that automatically handles refs (e1, e2...), text, or CSS selectors",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
                target: {
                  type: "string",
                  description: "Element ref (e.g. 'e16'), text content, or CSS selector",
                },
                strategy: {
                  type: "string",
                  enum: ["auto", "ref", "text", "selector"],
                  description: "Strategy to use (default: auto-detect)",
                },
                windowId: {
                  type: "string",
                  description: "Optional window ID (defaults to main window)",
                },
              },
              required: ["sessionId", "target"],
            },
          },
          {
            name: "browser_network_requests",
            description: "Get all network requests from the session",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "browser_console_messages",
            description: "Get all console messages from the session",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from app_launch",
                },
              },
              required: ["sessionId"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;

      try {
        const toolArgs = args || {};

        switch (name) {
          case "app_launch":
            return await this.handleAppLaunch(toolArgs);

          case "click":
            await this.handleClick(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.windowId as string);
            const clickSession = await this.getSession(toolArgs.sessionId as string);
            const clickContent: any[] = [{ type: "text", text: "Element clicked successfully" }];
            if (this.shouldIncludeSnapshot(clickSession)) {
              const clickSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
              clickContent.push({ type: "text", text: `Window Snapshot:\n${clickSnapshot}` });
            }
            return { content: clickContent };

          case "type":
            await this.handleType(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.text as string, toolArgs.windowId as string);
            const typeSession = await this.getSession(toolArgs.sessionId as string);
            const typeContent: any[] = [{ type: "text", text: "Text typed successfully" }];
            if (this.shouldIncludeSnapshot(typeSession)) {
              const typeSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
              typeContent.push({ type: "text", text: `Window Snapshot:\n${typeSnapshot}` });
            }
            return { content: typeContent };

          case "screenshot":
            const screenshotPath = await this.handleScreenshot(toolArgs.sessionId as string, toolArgs.path as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: `Screenshot saved to: ${screenshotPath}` }] };

          case "evaluate":
            const evalResult = await this.handleEvaluate(toolArgs.sessionId as string, toolArgs.script as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: `Result: ${JSON.stringify(evalResult)}` }] };

          case "wait_for_selector":
            await this.handleWaitForSelector(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.timeout as number, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Element found" }] };

          case "ipc_invoke":
            return await this.handleIpcInvoke(toolArgs.sessionId as string, toolArgs.channel as string, toolArgs.args as any[] || []);

          case "get_windows":
            return await this.handleGetWindows(toolArgs.sessionId as string);

          case "fs_write_file":
            await this.handleWriteFile(toolArgs.sessionId as string, toolArgs.filePath as string, toolArgs.content as string);
            return { content: [{ type: "text", text: "File written successfully" }] };

          case "fs_read_file":
            return await this.handleReadFile(toolArgs.sessionId as string, toolArgs.filePath as string);

          case "close":
            await this.handleClose(toolArgs.sessionId as string);
            return { content: [{ type: "text", text: "Session closed successfully" }] };

          case "keyboard_press":
            await this.handleKeyboardPress(toolArgs.sessionId as string, toolArgs.key as string, toolArgs.modifiers as string[], toolArgs.windowId as string);
            const kbPressSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Key pressed successfully" },
              { type: "text", text: `Window Snapshot:\n${kbPressSnapshot}` }
            ] };

          case "click_by_text":
            await this.handleClickByText(toolArgs.sessionId as string, toolArgs.text as string, toolArgs.exact as boolean, toolArgs.windowId as string);
            const clickTextSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Element clicked by text successfully" },
              { type: "text", text: `Window Snapshot:\n${clickTextSnapshot}` }
            ] };

          case "add_locator_handler":
            await this.handleAddLocatorHandler(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.action as "dismiss" | "accept" | "click", toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Locator handler added successfully" }] };

          case "click_by_role":
            await this.handleClickByRole(toolArgs.sessionId as string, toolArgs.role as string, toolArgs.name as string, toolArgs.windowId as string);
            const clickRoleSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Element clicked by role successfully" },
              { type: "text", text: `Window Snapshot:\n${clickRoleSnapshot}` }
            ] };

          case "click_nth":
            await this.handleClickNth(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.index as number, toolArgs.windowId as string);
            const clickNthSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Nth element clicked successfully" },
              { type: "text", text: `Window Snapshot:\n${clickNthSnapshot}` }
            ] };

          case "keyboard_type":
            await this.handleKeyboardType(toolArgs.sessionId as string, toolArgs.text as string, toolArgs.delay as number, toolArgs.windowId as string);
            const kbTypeSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Text typed successfully" },
              { type: "text", text: `Window Snapshot:\n${kbTypeSnapshot}` }
            ] };

          case "wait_for_load_state":
            await this.handleWaitForLoadState(
              toolArgs.sessionId as string, 
              toolArgs.state as "load" | "domcontentloaded" | "networkidle", 
              toolArgs.timeout as number | undefined,
              toolArgs.windowId as string
            );
            return { content: [{ type: "text", text: "Page load state reached" }] };

          case "snapshot":
            const snapshotResult = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: snapshotResult }] };

          case "hover":
            await this.handleHover(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.windowId as string);
            const hoverSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Element hovered successfully" },
              { type: "text", text: `Window Snapshot:\n${hoverSnapshot}` }
            ] };

          case "drag":
            await this.handleDrag(toolArgs.sessionId as string, toolArgs.sourceSelector as string, toolArgs.targetSelector as string, toolArgs.windowId as string);
            const dragSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Element dragged successfully" },
              { type: "text", text: `Window Snapshot:\n${dragSnapshot}` }
            ] };

          case "key":
            await this.handleKey(toolArgs.sessionId as string, toolArgs.key as string, toolArgs.windowId as string);
            const keySnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: `Key '${toolArgs.key}' pressed successfully` },
              { type: "text", text: `Window Snapshot:\n${keySnapshot}` }
            ] };

          case "select":
            await this.handleSelect(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.value as string, toolArgs.windowId as string);
            const selectSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Option selected successfully" },
              { type: "text", text: `Window Snapshot:\n${selectSnapshot}` }
            ] };

          case "upload":
            await this.handleUpload(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.filePath as string, toolArgs.windowId as string);
            const uploadSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "File uploaded successfully" },
              { type: "text", text: `Window Snapshot:\n${uploadSnapshot}` }
            ] };

          case "back":
            await this.handleBack(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Navigated back successfully" }] };

          case "forward":
            await this.handleForward(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Navigated forward successfully" }] };

          case "refresh":
            await this.handleRefresh(toolArgs.sessionId as string, toolArgs.windowId as string);
            const refreshSnapshot = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [
              { type: "text", text: "Window refreshed successfully" },
              { type: "text", text: `Window Snapshot:\n${refreshSnapshot}` }
            ] };

          case "content":
            const htmlContent = await this.handleContent(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: htmlContent }] };

          case "text_content":
            const textContent = await this.handleTextContent(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: textContent }] };

          case "smart_click":
            return await this.handleSmartClick(
              toolArgs.sessionId as string, 
              toolArgs.target as string, 
              toolArgs.strategy as string,
              toolArgs.windowId as string
            );

          case "browser_network_requests":
            return await this.handleNetworkRequests(toolArgs.sessionId as string);

          case "browser_console_messages":
            return await this.handleConsoleMessages(toolArgs.sessionId as string);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`[ELECTRON-MCP] Tool error for ${name}:`, error);
        // Return error but don't throw - this prevents transport from closing
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    });
  }

  private async getSession(sessionId: string): Promise<ElectronSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session as ElectronSession;
  }

  private shouldIncludeSnapshot(session: ElectronSession): boolean {
    return session.options?.includeSnapshots ?? false;
  }

  private async handleAppLaunch(args: any): Promise<ToolResult> {
    let debugInfo: string[] = [];
    
    try {
      const opts: ElectronLaunchOpts = {
        app: args.app,
        args: args.args,
        env: args.env,
        cwd: args.cwd,
        timeout: args.timeout,
        mode: args.mode,
        projectPath: args.projectPath,
        startScript: args.startScript,
        electronPath: args.electronPath,
        compressScreenshots: args.compressScreenshots,
        screenshotQuality: args.screenshotQuality,
        disableDevtools: args.disableDevtools,
        killPortConflicts: args.killPortConflicts,
        includeSnapshots: args.includeSnapshots ?? false, // Default to false for minimal context
      };

      debugInfo.push(`[DEBUG] Launch attempt for app: ${opts.app}`);
      debugInfo.push(`[DEBUG] Mode: ${opts.mode || 'auto'}`);
      debugInfo.push(`[DEBUG] Project path: ${opts.projectPath || 'not specified'}`);
      debugInfo.push(`[DEBUG] CWD: ${opts.cwd || process.cwd()}`);

      const session = await this.driver.launch(opts);
      this.sessions.set(session.id, session);

      return {
        content: [
          {
            type: "text",
            text: `Electron app launched successfully. Session ID: ${session.id}`,
          },
        ],
      };
    } catch (error) {
      // Capture additional debug info for the error response
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Include debug information in the error response so it appears in MCP logs
      const fullErrorMessage = [
        `Failed to launch Electron app: ${errorMessage}`,
        '',
        '=== DEBUG INFO ===',
        ...debugInfo,
        `[DEBUG] Final error: ${errorMessage}`,
        `[DEBUG] Error type: ${error?.constructor?.name || 'Unknown'}`,
        '=================='
      ].join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: fullErrorMessage,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleClick(sessionId: string, selector: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.click(session, selector, windowId);
  }

  private async handleSmartClick(sessionId: string, target: string, strategy?: string, windowId?: string): Promise<ToolResult> {
    const session = await this.getSession(sessionId);
    const actualStrategy = strategy || 'auto';
    
    try {
      // Determine click strategy
      if (actualStrategy === 'ref' || (actualStrategy === 'auto' && /^e\d+$/.test(target))) {
        // Handle ref-based clicking (e1, e2, etc.)
        const evalScript = `
          (() => {
            // Try to find element by ref attribute
            const elem = document.querySelector('[ref="${target}"]');
            if (elem) {
              elem.click();
              return 'Clicked element with ref="${target}"';
            }
            
            // Fallback: search all elements for ref attribute
            const allElems = Array.from(document.querySelectorAll('*'));
            const refElem = allElems.find(el => el.getAttribute('ref') === '${target}');
            if (refElem) {
              refElem.click();
              return 'Clicked element with ref="${target}" (fallback)';
            }
            
            throw new Error('Element with ref="${target}" not found');
          })()
        `;
        const result = await this.driver.evaluate(session, evalScript, windowId);
        
        const content: any[] = [{ type: "text", text: result }];
        if (this.shouldIncludeSnapshot(session)) {
          const snapshot = await this.handleSnapshot(sessionId, windowId);
          content.push({ type: "text", text: `Window Snapshot:\n${snapshot}` });
        }
        return { content };
        
      } else if (actualStrategy === 'text' || (actualStrategy === 'auto' && !target.includes('[') && !target.includes('.'))) {
        // Handle text-based clicking
        const evalScript = `
          (() => {
            const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            const targetButton = buttons.find(btn => 
              btn.textContent && btn.textContent.trim().includes('${target.replace(/'/g, "\\'").replace(/"/g, '\\"')}')
            );
            if (targetButton) {
              targetButton.click();
              return 'Clicked element containing text: "${target}"';
            }
            throw new Error('No clickable element found with text: "${target}"');
          })()
        `;
        const result = await this.driver.evaluate(session, evalScript, windowId);
        
        const content: any[] = [{ type: "text", text: result }];
        if (this.shouldIncludeSnapshot(session)) {
          const snapshot = await this.handleSnapshot(sessionId, windowId);
          content.push({ type: "text", text: `Window Snapshot:\n${snapshot}` });
        }
        return { content };
        
      } else {
        // Handle as CSS selector
        await this.driver.click(session, target, windowId);
        
        const content: any[] = [{ type: "text", text: `Clicked element with selector: ${target}` }];
        if (this.shouldIncludeSnapshot(session)) {
          const snapshot = await this.handleSnapshot(sessionId, windowId);
          content.push({ type: "text", text: `Window Snapshot:\n${snapshot}` });
        }
        return { content };
      }
    } catch (error) {
      return {
        content: [{ type: "text", text: `Smart click failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async handleType(sessionId: string, selector: string, text: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.type(session, selector, text, windowId);
  }

  private async handleScreenshot(sessionId: string, path?: string, windowId?: string): Promise<string> {
    const session = await this.getSession(sessionId);
    return await this.driver.screenshot(session, path, windowId);
  }

  private async handleEvaluate(sessionId: string, script: string, windowId?: string): Promise<any> {
    const session = await this.getSession(sessionId);
    return await this.driver.evaluate(session, script, windowId);
  }

  private async handleWaitForSelector(sessionId: string, selector: string, timeout?: number, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.waitForSelector(session, selector, timeout, windowId);
  }

  private async handleIpcInvoke(sessionId: string, channel: string, args: any[]): Promise<ToolResult> {
    const session = await this.getSession(sessionId);
    const result = await this.driver.invokeIPC(session, channel, ...args);

    return {
      content: [
        {
          type: "text",
          text: `IPC result: ${JSON.stringify(result)}`,
        },
      ],
    };
  }

  private async handleGetWindows(sessionId: string): Promise<ToolResult> {
    const session = await this.getSession(sessionId);
    const windows = await this.driver.getWindows(session);

    const windowDescriptions = windows.map(w => 
      `${w.id} (${w.type}${w.title ? `: "${w.title}"` : ''})`
    );

    return {
      content: [
        {
          type: "text",
          text: `Available windows:\n${windowDescriptions.join("\n")}`,
        },
      ],
    };
  }

  private async handleWriteFile(sessionId: string, filePath: string, content: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.writeFile(session, filePath, content);
  }

  private async handleReadFile(sessionId: string, filePath: string): Promise<ToolResult> {
    const session = await this.getSession(sessionId);
    const content = await this.driver.readFile(session, filePath);

    return {
      content: [
        {
          type: "text",
          text: content,
        },
      ],
    };
  }

  private async handleKeyboardPress(sessionId: string, key: string, modifiers?: string[], windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.keyboardPress(session, key, modifiers, windowId);
  }

  private async handleClickByText(sessionId: string, text: string, exact?: boolean, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.clickByText(session, text, exact || false, windowId);
  }

  private async handleAddLocatorHandler(sessionId: string, selector: string, action: "dismiss" | "accept" | "click", windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.addLocatorHandler(session, selector, action, windowId);
  }

  private async handleClickByRole(sessionId: string, role: string, name?: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.clickByRole(session, role, name, windowId);
  }

  private async handleClickNth(sessionId: string, selector: string, index: number, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.clickNth(session, selector, index, windowId);
  }

  private async handleKeyboardType(sessionId: string, text: string, delay?: number, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.keyboardType(session, text, delay, windowId);
  }

  private async handleWaitForLoadState(sessionId: string, state?: "load" | "domcontentloaded" | "networkidle", timeout?: number, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    // Use shorter default timeout for networkidle to prevent hanging
    const defaultTimeout = state === 'networkidle' ? 10000 : 30000;
    const effectiveTimeout = timeout !== undefined ? timeout : defaultTimeout;
    
    console.error(`[ELECTRON-MCP] waitForLoadState called - state: ${state || 'load'}, timeout: ${effectiveTimeout}ms, windowId: ${windowId || 'main'}`);
    
    try {
      await this.driver.waitForLoadState(session, state, effectiveTimeout, windowId);
      console.error(`[ELECTRON-MCP] waitForLoadState completed successfully`);
    } catch (error) {
      console.error(`[ELECTRON-MCP] waitForLoadState failed:`, error);
      throw error;
    }
  }

  private async handleSnapshot(sessionId: string, windowId?: string): Promise<string> {
    const session = await this.getSession(sessionId);
    // Always use interactive filter by default to reduce context usage
    return await this.driver.snapshot(session, windowId, 'interactive');
  }

  private async handleHover(sessionId: string, selector: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.hover(session, selector, windowId);
  }

  private async handleDrag(sessionId: string, sourceSelector: string, targetSelector: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.drag(session, sourceSelector, targetSelector, windowId);
  }

  private async handleKey(sessionId: string, key: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.key(session, key, windowId);
  }

  private async handleSelect(sessionId: string, selector: string, value: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.select(session, selector, value, windowId);
  }

  private async handleUpload(sessionId: string, selector: string, filePath: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.upload(session, selector, filePath, windowId);
  }

  private async handleBack(sessionId: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.back(session, windowId);
  }

  private async handleForward(sessionId: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.forward(session, windowId);
  }

  private async handleRefresh(sessionId: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.refresh(session, windowId);
  }

  private async handleContent(sessionId: string, windowId?: string): Promise<string> {
    const session = await this.getSession(sessionId);
    return await this.driver.content(session, windowId);
  }

  private async handleTextContent(sessionId: string, windowId?: string): Promise<string> {
    const session = await this.getSession(sessionId);
    return await this.driver.textContent(session, windowId);
  }

  private async handleClose(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.close(session);
    this.sessions.delete(sessionId);
  }

  private async handleNetworkRequests(sessionId: string): Promise<any> {
    const session = await this.getSession(sessionId);
    const requests = await this.driver.getNetworkRequests(session);
    return { content: [{ type: "text", text: JSON.stringify(requests, null, 2) }] };
  }

  private async handleConsoleMessages(sessionId: string): Promise<any> {
    const session = await this.getSession(sessionId);
    const messages = await this.driver.getConsoleMessages(session);
    return { content: [{ type: "text", text: JSON.stringify(messages, null, 2) }] };
  }

  async cleanup(): Promise<void> {
    console.error("[ELECTRON-MCP] Cleaning up server resources...");
    // Close all active sessions
    for (const [sessionId, session] of this.sessions) {
      try {
        await this.driver.close(session);
      } catch (error) {
        console.error(`[ELECTRON-MCP] Error closing session ${sessionId}:`, error);
      }
    }
    this.sessions.clear();
  }

  async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      
      // Enhanced transport error handling
      transport.onerror = (error: Error) => {
        console.error("[ELECTRON-MCP] Transport error:", error);
        console.error("[ELECTRON-MCP] Transport error stack:", error.stack);
      };
      
      transport.onclose = () => {
        console.error("[ELECTRON-MCP] Transport closed - connection terminated");
        console.error("[ELECTRON-MCP] Active sessions:", this.sessions.size);
        // Log but don't exit - the client may reconnect
      };
      
      // Add additional process event handlers
      process.stdin.on('error', (error) => {
        console.error("[ELECTRON-MCP] stdin error:", error);
      });
      
      process.stdout.on('error', (error) => {
        console.error("[ELECTRON-MCP] stdout error:", error);
      });
      
      process.stderr.on('error', (error) => {
        console.error("[ELECTRON-MCP] stderr error:", error);
      });
      
      console.error("[ELECTRON-MCP] Connecting transport...");
      console.error("[ELECTRON-MCP] Process PID:", process.pid);
      console.error("[ELECTRON-MCP] Node version:", process.version);
      console.error("[ELECTRON-MCP] Platform:", process.platform);
      
      await this.server.connect(transport);
      console.error("[ELECTRON-MCP] Transport connected successfully");
      
      // Enhanced connection monitoring
      const keepAlive = setInterval(() => {
        console.error("[ELECTRON-MCP] Heartbeat - transport active, sessions:", this.sessions.size);
      }, 30000); // Every 30 seconds
      
      // Keep process alive with multiple fallbacks
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      // Setup cleanup handlers but don't return a promise that blocks
      const cleanup = () => {
        clearInterval(keepAlive);
        console.error("[ELECTRON-MCP] Server shutting down gracefully");
      };
      
      process.on("disconnect", () => {
        console.error("[ELECTRON-MCP] Process disconnected");
        cleanup();
        process.exit(0);
      });
      
      process.on("SIGPIPE", () => {
        console.error("[ELECTRON-MCP] SIGPIPE received - broken pipe");
        cleanup();
        process.exit(0);
      });
      
      // Don't return a hanging promise - let the server.connect() promise resolve normally
      console.error("[ELECTRON-MCP] Server ready for requests");
    } catch (error) {
      console.error("[ELECTRON-MCP] Failed to connect transport:", error);
      console.error("[ELECTRON-MCP] Error details:", error instanceof Error ? error.stack : error);
      throw error;
    }
  }
}