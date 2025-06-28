import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Driver, ServerOpts, Session, ToolResult } from "./types.js";

export class MCPServer {
  protected server: Server;
  private driver: Driver;
  private sessions = new Map<string, Session>();

  constructor(private opts: ServerOpts) {
    this.driver = opts.driver;
    this.server = new Server(
      {
        name: opts.name,
        version: opts.version || "0.1.0",
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
            name: "click",
            description: "Click on an element identified by a CSS selector",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the element to click",
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
                  description: "Session ID returned from launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the element to type into",
                },
                text: {
                  type: "string",
                  description: "Text to type",
                },
              },
              required: ["sessionId", "selector", "text"],
            },
          },
          {
            name: "screenshot",
            description: "Take a screenshot of the current page or window",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from launch",
                },
                path: {
                  type: "string",
                  description: "Optional path to save the screenshot",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "evaluate",
            description: "Execute JavaScript in the page or application context",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from launch",
                },
                script: {
                  type: "string",
                  description: "JavaScript code to execute",
                },
              },
              required: ["sessionId", "script"],
            },
          },
          {
            name: "wait_for_selector",
            description: "Wait for an element to appear on the page",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "Session ID returned from launch",
                },
                selector: {
                  type: "string",
                  description: "CSS selector to wait for",
                },
                timeout: {
                  type: "number",
                  description: "Timeout in milliseconds (default: 30000)",
                },
              },
              required: ["sessionId", "selector"],
            },
          },
          {
            name: "close",
            description: "Close a session",
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
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;

      try {
        const toolArgs = args || {};

        switch (name) {
          case "click":
            await this.handleClick(toolArgs.sessionId as string, toolArgs.selector as string);
            return { content: [{ type: "text", text: "Element clicked successfully" }] };

          case "type":
            await this.handleType(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.text as string);
            return { content: [{ type: "text", text: "Text typed successfully" }] };

          case "screenshot":
            const screenshotPath = await this.handleScreenshot(toolArgs.sessionId as string, toolArgs.path as string);
            return { content: [{ type: "text", text: `Screenshot saved to: ${screenshotPath}` }] };

          case "evaluate":
            const evalResult = await this.handleEvaluate(toolArgs.sessionId as string, toolArgs.script as string);
            return { content: [{ type: "text", text: `Result: ${JSON.stringify(evalResult)}` }] };

          case "wait_for_selector":
            await this.handleWaitForSelector(toolArgs.sessionId as string, toolArgs.selector as string, toolArgs.timeout as number);
            return { content: [{ type: "text", text: "Element found" }] };

          case "close":
            await this.handleClose(toolArgs.sessionId as string);
            return { content: [{ type: "text", text: "Session closed successfully" }] };

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

  protected async getSession(sessionId: string): Promise<Session> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  protected async handleClick(sessionId: string, selector: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.driver.click(session, selector);
  }

  protected async handleType(sessionId: string, selector: string, text: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!this.driver.type) {
      throw new Error("Type operation not supported by this driver");
    }
    await this.driver.type(session, selector, text);
  }

  protected async handleScreenshot(sessionId: string, path?: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!this.driver.screenshot) {
      throw new Error("Screenshot operation not supported by this driver");
    }
    return await this.driver.screenshot(session, path);
  }

  protected async handleEvaluate(sessionId: string, script: string): Promise<any> {
    const session = await this.getSession(sessionId);
    if (!this.driver.evaluate) {
      throw new Error("Evaluate operation not supported by this driver");
    }
    return await this.driver.evaluate(session, script);
  }

  protected async handleWaitForSelector(sessionId: string, selector: string, timeout?: number): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!this.driver.waitForSelector) {
      throw new Error("WaitForSelector operation not supported by this driver");
    }
    await this.driver.waitForSelector(session, selector, timeout);
  }

  protected async handleClose(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (this.driver.close) {
      await this.driver.close(session);
    }
    this.sessions.delete(sessionId);
  }

  protected addSession(session: Session): void {
    this.sessions.set(session.id, session);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

export async function runServer(opts: ServerOpts): Promise<void> {
  const server = new MCPServer(opts);
  await server.run();
}