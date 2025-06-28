"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebMCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const web_driver_js_1 = require("./web-driver.js");
class WebMCPServer {
    name;
    version;
    server;
    driver;
    sessions = new Map();
    constructor(name, version = "0.1.0") {
        this.name = name;
        this.version = version;
        this.driver = new web_driver_js_1.WebDriver();
        this.server = new index_js_1.Server({
            name: this.name,
            version: this.version,
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "browser_launch",
                        description: "Launch a new browser session",
                        inputSchema: {
                            type: "object",
                            properties: {
                                browser: {
                                    type: "string",
                                    enum: ["chromium", "firefox", "webkit"],
                                    description: "Browser engine to use (default: chromium)",
                                },
                                headed: {
                                    type: "boolean",
                                    description: "Run in headed mode (default: false)",
                                },
                                timeout: {
                                    type: "number",
                                    description: "Launch timeout in milliseconds",
                                },
                                viewport: {
                                    type: "object",
                                    properties: {
                                        width: { type: "number" },
                                        height: { type: "number" },
                                    },
                                    description: "Viewport size",
                                },
                            },
                            required: [],
                        },
                    },
                    {
                        name: "browser_navigate",
                        description: "Navigate to a URL in an existing browser session",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                                url: {
                                    type: "string",
                                    description: "URL to navigate to",
                                },
                            },
                            required: ["sessionId", "url"],
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
                                    description: "Session ID returned from browser_launch",
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
                                    description: "Session ID returned from browser_launch",
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
                        description: "Take a screenshot of the current page",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
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
                        description: "Execute JavaScript in the page context",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
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
                                    description: "Session ID returned from browser_launch",
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
                        name: "snapshot",
                        description: "Get accessibility tree snapshot of the current page",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
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
                                    description: "Session ID returned from browser_launch",
                                },
                                selector: {
                                    type: "string",
                                    description: "CSS selector for the element to hover over",
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
                                    description: "Session ID returned from browser_launch",
                                },
                                sourceSelector: {
                                    type: "string",
                                    description: "CSS selector for the element to drag",
                                },
                                targetSelector: {
                                    type: "string",
                                    description: "CSS selector for the drop target",
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
                                    description: "Session ID returned from browser_launch",
                                },
                                key: {
                                    type: "string",
                                    description: "Key to press (e.g., 'Enter', 'Tab', 'Escape')",
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
                                    description: "Session ID returned from browser_launch",
                                },
                                selector: {
                                    type: "string",
                                    description: "CSS selector for the select element",
                                },
                                value: {
                                    type: "string",
                                    description: "Value to select",
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
                                    description: "Session ID returned from browser_launch",
                                },
                                selector: {
                                    type: "string",
                                    description: "CSS selector for the file input element",
                                },
                                filePath: {
                                    type: "string",
                                    description: "Path to the file to upload",
                                },
                            },
                            required: ["sessionId", "selector", "filePath"],
                        },
                    },
                    {
                        name: "back",
                        description: "Navigate back in browser history",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                            },
                            required: ["sessionId"],
                        },
                    },
                    {
                        name: "forward",
                        description: "Navigate forward in browser history",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                            },
                            required: ["sessionId"],
                        },
                    },
                    {
                        name: "refresh",
                        description: "Refresh the current page",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                            },
                            required: ["sessionId"],
                        },
                    },
                    {
                        name: "pdf",
                        description: "Save the current page as a PDF",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                                path: {
                                    type: "string",
                                    description: "Optional path to save the PDF",
                                },
                            },
                            required: ["sessionId"],
                        },
                    },
                    {
                        name: "content",
                        description: "Get the HTML content of the current page",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                            },
                            required: ["sessionId"],
                        },
                    },
                    {
                        name: "text_content",
                        description: "Get the visible text content of the current page",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                            },
                            required: ["sessionId"],
                        },
                    },
                    {
                        name: "close",
                        description: "Close a browser session",
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
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                const toolArgs = args || {};
                switch (name) {
                    case "browser_launch":
                        return await this.handleBrowserLaunch(toolArgs);
                    case "browser_navigate":
                        await this.handleBrowserNavigate(toolArgs.sessionId, toolArgs.url);
                        return { content: [{ type: "text", text: "Navigation completed successfully" }] };
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
                    case "snapshot":
                        const snapshotResult = await this.handleSnapshot(toolArgs.sessionId);
                        return { content: [{ type: "text", text: snapshotResult }] };
                    case "hover":
                        await this.handleHover(toolArgs.sessionId, toolArgs.selector);
                        return { content: [{ type: "text", text: "Element hovered successfully" }] };
                    case "drag":
                        await this.handleDrag(toolArgs.sessionId, toolArgs.sourceSelector, toolArgs.targetSelector);
                        return { content: [{ type: "text", text: "Element dragged successfully" }] };
                    case "key":
                        await this.handleKey(toolArgs.sessionId, toolArgs.key);
                        return { content: [{ type: "text", text: `Key '${toolArgs.key}' pressed successfully` }] };
                    case "select":
                        await this.handleSelect(toolArgs.sessionId, toolArgs.selector, toolArgs.value);
                        return { content: [{ type: "text", text: "Option selected successfully" }] };
                    case "upload":
                        await this.handleUpload(toolArgs.sessionId, toolArgs.selector, toolArgs.filePath);
                        return { content: [{ type: "text", text: "File uploaded successfully" }] };
                    case "back":
                        await this.handleBack(toolArgs.sessionId);
                        return { content: [{ type: "text", text: "Navigated back successfully" }] };
                    case "forward":
                        await this.handleForward(toolArgs.sessionId);
                        return { content: [{ type: "text", text: "Navigated forward successfully" }] };
                    case "refresh":
                        await this.handleRefresh(toolArgs.sessionId);
                        return { content: [{ type: "text", text: "Page refreshed successfully" }] };
                    case "pdf":
                        const pdfPath = await this.handlePdf(toolArgs.sessionId, toolArgs.path);
                        return { content: [{ type: "text", text: `PDF saved to: ${pdfPath}` }] };
                    case "content":
                        const htmlContent = await this.handleContent(toolArgs.sessionId);
                        return { content: [{ type: "text", text: htmlContent }] };
                    case "text_content":
                        const textContent = await this.handleTextContent(toolArgs.sessionId);
                        return { content: [{ type: "text", text: textContent }] };
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
    async handleBrowserLaunch(args) {
        const opts = {
            browser: args.browser || "chromium",
            headed: args.headed || false,
            timeout: args.timeout,
            viewport: args.viewport,
        };
        const session = await this.driver.launch(opts);
        this.sessions.set(session.id, session);
        return {
            content: [
                {
                    type: "text",
                    text: `Browser launched successfully. Session ID: ${session.id}`,
                },
            ],
        };
    }
    async handleBrowserNavigate(sessionId, url) {
        const session = await this.getSession(sessionId);
        await this.driver.navigate(session, url);
    }
    async handleClick(sessionId, selector) {
        const session = await this.getSession(sessionId);
        await this.driver.click(session, selector);
    }
    async handleType(sessionId, selector, text) {
        const session = await this.getSession(sessionId);
        await this.driver.type(session, selector, text);
    }
    async handleScreenshot(sessionId, path) {
        const session = await this.getSession(sessionId);
        return await this.driver.screenshot(session, path);
    }
    async handleEvaluate(sessionId, script) {
        const session = await this.getSession(sessionId);
        return await this.driver.evaluate(session, script);
    }
    async handleWaitForSelector(sessionId, selector, timeout) {
        const session = await this.getSession(sessionId);
        await this.driver.waitForSelector(session, selector, timeout);
    }
    async handleSnapshot(sessionId) {
        const session = await this.getSession(sessionId);
        return await this.driver.snapshot(session);
    }
    async handleHover(sessionId, selector) {
        const session = await this.getSession(sessionId);
        await this.driver.hover(session, selector);
    }
    async handleDrag(sessionId, sourceSelector, targetSelector) {
        const session = await this.getSession(sessionId);
        await this.driver.drag(session, sourceSelector, targetSelector);
    }
    async handleKey(sessionId, key) {
        const session = await this.getSession(sessionId);
        await this.driver.key(session, key);
    }
    async handleSelect(sessionId, selector, value) {
        const session = await this.getSession(sessionId);
        await this.driver.select(session, selector, value);
    }
    async handleUpload(sessionId, selector, filePath) {
        const session = await this.getSession(sessionId);
        await this.driver.upload(session, selector, filePath);
    }
    async handleBack(sessionId) {
        const session = await this.getSession(sessionId);
        await this.driver.back(session);
    }
    async handleForward(sessionId) {
        const session = await this.getSession(sessionId);
        await this.driver.forward(session);
    }
    async handleRefresh(sessionId) {
        const session = await this.getSession(sessionId);
        await this.driver.refresh(session);
    }
    async handlePdf(sessionId, path) {
        const session = await this.getSession(sessionId);
        return await this.driver.pdf(session, path);
    }
    async handleContent(sessionId) {
        const session = await this.getSession(sessionId);
        return await this.driver.content(session);
    }
    async handleTextContent(sessionId) {
        const session = await this.getSession(sessionId);
        return await this.driver.textContent(session);
    }
    async handleClose(sessionId) {
        const session = await this.getSession(sessionId);
        await this.driver.close(session);
        this.sessions.delete(sessionId);
    }
    async run() {
        try {
            console.error("[DEBUG] Starting Web MCP server...");
            const transport = new stdio_js_1.StdioServerTransport();
            console.error("[DEBUG] Transport created, connecting...");
            await this.server.connect(transport);
            console.error("[DEBUG] Web MCP server connected and running");
        }
        catch (error) {
            console.error("[DEBUG] Error in web server.run():", error);
            throw error;
        }
    }
}
exports.WebMCPServer = WebMCPServer;
//# sourceMappingURL=web-server.js.map