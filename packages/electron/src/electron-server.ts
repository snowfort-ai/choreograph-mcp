import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Session, ToolResult } from "sfcg-mcp-core";
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
            description: "Launch an Electron application",
            inputSchema: {
              type: "object",
              properties: {
                app: {
                  type: "string",
                  description: "Path to the Electron application executable",
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
              },
              required: ["app"],
            },
          },
          {
            name: "click",
            description: "Click on an element identified by a CSS selector",
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
            description: "Type text into an element identified by a CSS selector",
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
            description: "Take a screenshot of the current window",
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
            description: "Get list of available windows in the Electron application",
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
            description: "Close an Electron application session",
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
                  description: "Load state to wait for (default: 'load')",
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
            description: "Get accessibility tree snapshot of the current window",
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
            return { content: [{ type: "text", text: "Element clicked successfully" }] };

          case "type":
            await this.handleType(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.text as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Text typed successfully" }] };

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
            return { content: [{ type: "text", text: "Key pressed successfully" }] };

          case "click_by_text":
            await this.handleClickByText(toolArgs.sessionId as string, toolArgs.text as string, toolArgs.exact as boolean, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Element clicked by text successfully" }] };

          case "add_locator_handler":
            await this.handleAddLocatorHandler(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.action as "dismiss" | "accept" | "click", toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Locator handler added successfully" }] };

          case "click_by_role":
            await this.handleClickByRole(toolArgs.sessionId as string, toolArgs.role as string, toolArgs.name as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Element clicked by role successfully" }] };

          case "click_nth":
            await this.handleClickNth(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.index as number, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Nth element clicked successfully" }] };

          case "keyboard_type":
            await this.handleKeyboardType(toolArgs.sessionId as string, toolArgs.text as string, toolArgs.delay as number, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Text typed successfully" }] };

          case "wait_for_load_state":
            await this.handleWaitForLoadState(toolArgs.sessionId as string, toolArgs.state as "load" | "domcontentloaded" | "networkidle", toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Page load state reached" }] };

          case "snapshot":
            const snapshotResult = await this.handleSnapshot(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: snapshotResult }] };

          case "hover":
            await this.handleHover(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Element hovered successfully" }] };

          case "drag":
            await this.handleDrag(toolArgs.sessionId as string, toolArgs.sourceSelector as string, toolArgs.targetSelector as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Element dragged successfully" }] };

          case "key":
            await this.handleKey(toolArgs.sessionId as string, toolArgs.key as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: `Key '${toolArgs.key}' pressed successfully` }] };

          case "select":
            await this.handleSelect(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.value as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Option selected successfully" }] };

          case "upload":
            await this.handleUpload(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.filePath as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "File uploaded successfully" }] };

          case "back":
            await this.handleBack(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Navigated back successfully" }] };

          case "forward":
            await this.handleForward(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Navigated forward successfully" }] };

          case "refresh":
            await this.handleRefresh(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: "Window refreshed successfully" }] };

          case "content":
            const htmlContent = await this.handleContent(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: htmlContent }] };

          case "text_content":
            const textContent = await this.handleTextContent(toolArgs.sessionId as string, toolArgs.windowId as string);
            return { content: [{ type: "text", text: textContent }] };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
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

  private async handleAppLaunch(args: any): Promise<ToolResult> {
    const opts: ElectronLaunchOpts = {
      app: args.app,
      args: args.args,
      env: args.env,
      cwd: args.cwd,
      timeout: args.timeout,
    };

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
  }

  private async handleClick(sessionId: string, selector: string, windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.click(session, selector, windowId);
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

    return {
      content: [
        {
          type: "text",
          text: `Available windows: ${windows.join(", ")}`,
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

  private async handleWaitForLoadState(sessionId: string, state?: "load" | "domcontentloaded" | "networkidle", windowId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.waitForLoadState(session, state, windowId);
  }

  private async handleSnapshot(sessionId: string, windowId?: string): Promise<string> {
    const session = await this.getSession(sessionId);
    return await this.driver.snapshot(session, windowId);
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}