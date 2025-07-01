#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const web_server_js_1 = require("./web-server.js");
// Track server instance to handle cleanup
let serverInstance = null;
// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("[WEB-MCP] Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit immediately - let MCP server handle errors gracefully
});
process.on("uncaughtException", (error) => {
    console.error("[WEB-MCP] Uncaught Exception:", error);
    // Only exit on truly fatal errors
    if (error.message && error.message.includes('MCP Server')) {
        process.exit(1);
    }
});
// Handle process termination gracefully
process.on("SIGINT", async () => {
    console.error("[WEB-MCP] Received SIGINT, shutting down gracefully...");
    if (serverInstance) {
        await serverInstance.cleanup();
    }
    process.exit(0);
});
process.on("SIGTERM", async () => {
    console.error("[WEB-MCP] Received SIGTERM, shutting down gracefully...");
    if (serverInstance) {
        await serverInstance.cleanup();
    }
    process.exit(0);
});
// Keep the process alive
process.stdin.on("end", () => {
    console.error("[WEB-MCP] stdin ended, keeping process alive...");
});
const program = new commander_1.Command();
program
    .name("circuit-web")
    .description("Snowfort Circuit Web MCP - Computer use for webapps and electron apps")
    .version("0.0.6")
    .option("--port <port>", "Port to listen on (stdio mode only)")
    .option("--browser <browser>", "Default browser engine", "chromium")
    .option("--headed", "Run in headed mode by default")
    .option("--name <name>", "Server name for MCP handshake", "circuit-web")
    .action(async (options) => {
    try {
        console.error("[WEB-MCP] Starting MCP server...");
        serverInstance = new web_server_js_1.WebMCPServer(options.name, "0.0.6");
        await serverInstance.run();
        console.error("[WEB-MCP] MCP server running");
    }
    catch (error) {
        console.error("[WEB-MCP] Fatal MCP Server Error:", error);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map