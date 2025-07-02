import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
export class MCPServer {
    opts;
    server;
    driver;
    sessions = new Map();
    constructor(opts) {
        this.opts = opts;
        this.driver = opts.driver;
        this.server = new Server({
            name: opts.name,
            version: opts.version || "0.1.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
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
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                const toolArgs = args || {};
                switch (name) {
                    case "click":
                        await this.handleClick(toolArgs.sessionId, toolArgs.selector);
                        return { content: [{ type: "text", text: "Element clicked successfully" }] };
                    case "type":
                        await this.handleType(toolArgs.sessionId, toolArgs.selector, toolArgs.text);
                        return { content: [{ type: "text", text: "Text typed successfully" }] };
                    case "screenshot":
                        const screenshotPath = await this.handleScreenshot(toolArgs.sessionId, toolArgs.path);
                        return { content: [{ type: "text", text: `Screenshot saved to: ${screenshotPath}` }] };
                    case "evaluate":
                        const evalResult = await this.handleEvaluate(toolArgs.sessionId, toolArgs.script);
                        return { content: [{ type: "text", text: `Result: ${JSON.stringify(evalResult)}` }] };
                    case "wait_for_selector":
                        await this.handleWaitForSelector(toolArgs.sessionId, toolArgs.selector, toolArgs.timeout);
                        return { content: [{ type: "text", text: "Element found" }] };
                    case "close":
                        await this.handleClose(toolArgs.sessionId);
                        return { content: [{ type: "text", text: "Session closed successfully" }] };
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        });
    }
    async getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        return session;
    }
    async handleClick(sessionId, selector) {
        const session = await this.getSession(sessionId);
        await this.driver.click(session, selector);
    }
    async handleType(sessionId, selector, text) {
        const session = await this.getSession(sessionId);
        if (!this.driver.type) {
            throw new Error("Type operation not supported by this driver");
        }
        await this.driver.type(session, selector, text);
    }
    async handleScreenshot(sessionId, path) {
        const session = await this.getSession(sessionId);
        if (!this.driver.screenshot) {
            throw new Error("Screenshot operation not supported by this driver");
        }
        return await this.driver.screenshot(session, path);
    }
    async handleEvaluate(sessionId, script) {
        const session = await this.getSession(sessionId);
        if (!this.driver.evaluate) {
            throw new Error("Evaluate operation not supported by this driver");
        }
        return await this.driver.evaluate(session, script);
    }
    async handleWaitForSelector(sessionId, selector, timeout) {
        const session = await this.getSession(sessionId);
        if (!this.driver.waitForSelector) {
            throw new Error("WaitForSelector operation not supported by this driver");
        }
        await this.driver.waitForSelector(session, selector, timeout);
    }
    async handleClose(sessionId) {
        const session = await this.getSession(sessionId);
        if (this.driver.close) {
            await this.driver.close(session);
        }
        this.sessions.delete(sessionId);
    }
    addSession(session) {
        this.sessions.set(session.id, session);
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}
export async function runServer(opts) {
    const server = new MCPServer(opts);
    await server.run();
}
//# sourceMappingURL=server.js.map