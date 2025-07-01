import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { WebDriver } from "./web-driver.js";
export class WebMCPServer {
    name;
    version;
    server;
    driver;
    sessions = new Map();
    constructor(name, version = "0.1.0") {
        this.name = name;
        this.version = version;
        this.driver = new WebDriver();
        this.server = new Server({
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
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
                                compressScreenshots: {
                                    type: "boolean",
                                    description: "Compress screenshots to JPEG (default: true)",
                                },
                                screenshotQuality: {
                                    type: "number",
                                    description: "JPEG quality 1-100 (default: 50)",
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
                    {
                        name: "browser_resize",
                        description: "Resize browser window viewport",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                                width: {
                                    type: "number",
                                    description: "Viewport width in pixels",
                                },
                                height: {
                                    type: "number",
                                    description: "Viewport height in pixels",
                                },
                            },
                            required: ["sessionId", "width", "height"],
                        },
                    },
                    {
                        name: "browser_handle_dialog",
                        description: "Handle browser dialogs (alert, confirm, prompt)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                                action: {
                                    type: "string",
                                    enum: ["accept", "dismiss"],
                                    description: "Action to take on dialogs",
                                },
                                promptText: {
                                    type: "string",
                                    description: "Text to enter for prompt dialogs",
                                },
                            },
                            required: ["sessionId", "action"],
                        },
                    },
                    {
                        name: "browser_tab_new",
                        description: "Open a new tab",
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
                        name: "browser_tab_list",
                        description: "List all open tabs",
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
                        name: "browser_tab_select",
                        description: "Select a tab by ID",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                                tabId: {
                                    type: "string",
                                    description: "Tab ID to select",
                                },
                            },
                            required: ["sessionId", "tabId"],
                        },
                    },
                    {
                        name: "browser_tab_close",
                        description: "Close a tab by ID",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sessionId: {
                                    type: "string",
                                    description: "Session ID returned from browser_launch",
                                },
                                tabId: {
                                    type: "string",
                                    description: "Tab ID to close",
                                },
                            },
                            required: ["sessionId", "tabId"],
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
                                    description: "Session ID returned from browser_launch",
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
                                    description: "Session ID returned from browser_launch",
                                },
                            },
                            required: ["sessionId"],
                        },
                    },
                    {
                        name: "browser_generate_playwright_test",
                        description: "Generate Playwright test code from recorded actions",
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
                ],
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                const toolArgs = args || {};
                switch (name) {
                    case "browser_launch":
                        return await this.handleBrowserLaunch(toolArgs);
                    case "browser_navigate":
                        await this.handleBrowserNavigate(toolArgs.sessionId, toolArgs.url);
                        const navSnapshot = await this.handleSnapshot(toolArgs.sessionId);
                        return { content: [
                                { type: "text", text: "Navigation completed successfully" },
                                { type: "text", text: `Page Snapshot:\n${navSnapshot}` }
                            ] };
                    case "click":
                        await this.handleClick(toolArgs.sessionId, toolArgs.selector);
                        const clickSnapshot = await this.handleSnapshot(toolArgs.sessionId);
                        return { content: [
                                { type: "text", text: "Element clicked successfully" },
                                { type: "text", text: `Page Snapshot:\n${clickSnapshot}` }
                            ] };
                    case "type":
                        await this.handleType(toolArgs.sessionId, toolArgs.selector, toolArgs.text);
                        const typeSnapshot = await this.handleSnapshot(toolArgs.sessionId);
                        return { content: [
                                { type: "text", text: "Text typed successfully" },
                                { type: "text", text: `Page Snapshot:\n${typeSnapshot}` }
                            ] };
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
                        const hoverSnapshot = await this.handleSnapshot(toolArgs.sessionId);
                        return { content: [
                                { type: "text", text: "Element hovered successfully" },
                                { type: "text", text: `Page Snapshot:\n${hoverSnapshot}` }
                            ] };
                    case "drag":
                        await this.handleDrag(toolArgs.sessionId, toolArgs.sourceSelector, toolArgs.targetSelector);
                        return { content: [{ type: "text", text: "Element dragged successfully" }] };
                    case "key":
                        await this.handleKey(toolArgs.sessionId, toolArgs.key);
                        const keySnapshot = await this.handleSnapshot(toolArgs.sessionId);
                        return { content: [
                                { type: "text", text: `Key '${toolArgs.key}' pressed successfully` },
                                { type: "text", text: `Page Snapshot:\n${keySnapshot}` }
                            ] };
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
                    case "browser_resize":
                        await this.handleResize(toolArgs.sessionId, toolArgs.width, toolArgs.height);
                        const resizeSnapshot = await this.handleSnapshot(toolArgs.sessionId);
                        return { content: [
                                { type: "text", text: `Browser resized to ${toolArgs.width}x${toolArgs.height}` },
                                { type: "text", text: `Page Snapshot:\n${resizeSnapshot}` }
                            ] };
                    case "browser_handle_dialog":
                        await this.handleDialogSetup(toolArgs.sessionId, toolArgs.action, toolArgs.promptText);
                        return { content: [{ type: "text", text: `Dialog handler set to ${toolArgs.action}` }] };
                    case "browser_tab_new":
                        const newTabId = await this.handleNewTab(toolArgs.sessionId);
                        return { content: [{ type: "text", text: `New tab created with ID: ${newTabId}` }] };
                    case "browser_tab_list":
                        const tabs = await this.handleListTabs(toolArgs.sessionId);
                        return { content: [{ type: "text", text: JSON.stringify(tabs, null, 2) }] };
                    case "browser_tab_select":
                        await this.handleSelectTab(toolArgs.sessionId, toolArgs.tabId);
                        const tabSnapshot = await this.handleSnapshot(toolArgs.sessionId);
                        return { content: [
                                { type: "text", text: `Tab ${toolArgs.tabId} selected` },
                                { type: "text", text: `Page Snapshot:\n${tabSnapshot}` }
                            ] };
                    case "browser_tab_close":
                        await this.handleCloseTab(toolArgs.sessionId, toolArgs.tabId);
                        return { content: [{ type: "text", text: `Tab ${toolArgs.tabId} closed` }] };
                    case "browser_network_requests":
                        const requests = await this.handleNetworkRequests(toolArgs.sessionId);
                        return { content: [{ type: "text", text: JSON.stringify(requests, null, 2) }] };
                    case "browser_console_messages":
                        const messages = await this.handleConsoleMessages(toolArgs.sessionId);
                        return { content: [{ type: "text", text: JSON.stringify(messages, null, 2) }] };
                    case "browser_generate_playwright_test":
                        const testCode = await this.handleGenerateTest(toolArgs.sessionId);
                        return { content: [{ type: "text", text: testCode }] };
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
    async handleResize(sessionId, width, height) {
        const session = await this.getSession(sessionId);
        await this.driver.resize(session, width, height);
    }
    async handleDialogSetup(sessionId, action, promptText) {
        const session = await this.getSession(sessionId);
        await this.driver.handleDialog(session, action, promptText);
    }
    async handleNewTab(sessionId) {
        const session = await this.getSession(sessionId);
        return await this.driver.newTab(session);
    }
    async handleListTabs(sessionId) {
        const session = await this.getSession(sessionId);
        return await this.driver.listTabs(session);
    }
    async handleSelectTab(sessionId, tabId) {
        const session = await this.getSession(sessionId);
        await this.driver.selectTab(session, tabId);
    }
    async handleCloseTab(sessionId, tabId) {
        const session = await this.getSession(sessionId);
        await this.driver.closeTab(session, tabId);
    }
    async handleNetworkRequests(sessionId) {
        const session = await this.getSession(sessionId);
        return await this.driver.getNetworkRequests(session);
    }
    async handleConsoleMessages(sessionId) {
        const session = await this.getSession(sessionId);
        return await this.driver.getConsoleMessages(session);
    }
    async handleGenerateTest(sessionId) {
        const session = await this.getSession(sessionId);
        return await this.driver.generatePlaywrightTest(session);
    }
    async cleanup() {
        console.error("[WEB-MCP] Cleaning up server resources...");
        // Close all active sessions
        for (const [sessionId, session] of this.sessions) {
            try {
                await this.driver.close(session);
            }
            catch (error) {
                console.error(`[WEB-MCP] Error closing session ${sessionId}:`, error);
            }
        }
        this.sessions.clear();
    }
    async run() {
        try {
            console.error("[WEB-MCP] Starting Web MCP server...");
            const transport = new StdioServerTransport();
            // Enhanced transport error handling
            transport.onerror = (error) => {
                console.error("[WEB-MCP] Transport error:", error);
                console.error("[WEB-MCP] Transport error stack:", error.stack);
            };
            transport.onclose = () => {
                console.error("[WEB-MCP] Transport closed - connection terminated");
                console.error("[WEB-MCP] Active sessions:", this.sessions.size);
                // Log but don't exit - the client may reconnect
            };
            // Add additional process event handlers
            process.stdin.on('error', (error) => {
                console.error("[WEB-MCP] stdin error:", error);
            });
            process.stdout.on('error', (error) => {
                console.error("[WEB-MCP] stdout error:", error);
            });
            process.stderr.on('error', (error) => {
                console.error("[WEB-MCP] stderr error:", error);
            });
            console.error("[WEB-MCP] Connecting transport...");
            console.error("[WEB-MCP] Process PID:", process.pid);
            console.error("[WEB-MCP] Node version:", process.version);
            console.error("[WEB-MCP] Platform:", process.platform);
            await this.server.connect(transport);
            console.error("[WEB-MCP] Transport connected successfully");
            // Enhanced connection monitoring
            const keepAlive = setInterval(() => {
                console.error("[WEB-MCP] Heartbeat - transport active, sessions:", this.sessions.size);
            }, 30000); // Every 30 seconds
            // Keep process alive with multiple fallbacks
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            // Setup cleanup handlers but don't return a promise that blocks
            const cleanup = () => {
                clearInterval(keepAlive);
                console.error("[WEB-MCP] Server shutting down gracefully");
            };
            process.on("disconnect", () => {
                console.error("[WEB-MCP] Process disconnected");
                cleanup();
                process.exit(0);
            });
            process.on("SIGPIPE", () => {
                console.error("[WEB-MCP] SIGPIPE received - broken pipe");
                cleanup();
                process.exit(0);
            });
            // Don't return a hanging promise - let the server.connect() promise resolve normally
            console.error("[WEB-MCP] Server ready for requests");
        }
        catch (error) {
            console.error("[WEB-MCP] Failed to connect transport:", error);
            console.error("[WEB-MCP] Error details:", error instanceof Error ? error.stack : error);
            throw error;
        }
    }
}
//# sourceMappingURL=web-server.js.map