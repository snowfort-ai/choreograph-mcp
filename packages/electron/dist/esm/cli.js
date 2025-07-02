#!/usr/bin/env node
// Apply buffer patch for Node.js v24 compatibility before any MCP imports
import "@snowfort/circuit-core/buffer-patch.js";
import { Command } from "commander";
import { ElectronMCPServer } from "./electron-server.js";
// Track server instance to handle cleanup
let serverInstance = null;
// Handle unhandled rejections gracefully to avoid closing MCP transport
process.on("unhandledRejection", (reason, promise) => {
    console.error("[ELECTRON-MCP] Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit - let MCP server handle errors gracefully
});
process.on("uncaughtException", (error) => {
    console.error("[ELECTRON-MCP] Uncaught Exception:", error);
    // Only exit on truly fatal errors, not on launch failures
    if (error.message && error.message.includes('MCP Server')) {
        process.exit(1);
    }
});
// Handle process termination gracefully
process.on("SIGINT", async () => {
    console.error("[ELECTRON-MCP] Received SIGINT, shutting down gracefully...");
    if (serverInstance) {
        await serverInstance.cleanup();
    }
    process.exit(0);
});
process.on("SIGTERM", async () => {
    console.error("[ELECTRON-MCP] Received SIGTERM, shutting down gracefully...");
    if (serverInstance) {
        await serverInstance.cleanup();
    }
    process.exit(0);
});
// Keep the process alive
process.stdin.on("end", () => {
    console.error("[ELECTRON-MCP] stdin ended, keeping process alive...");
});
const program = new Command();
program
    .name("circuit-electron")
    .description("Snowfort Circuit Electron MCP - Computer use for webapps and electron apps")
    .version("0.0.15")
    .option("--name <name>", "Server name for MCP handshake", "circuit-electron")
    .action(async (options) => {
    try {
        console.error("[ELECTRON-MCP] Starting MCP server...");
        serverInstance = new ElectronMCPServer(options.name, "0.0.15");
        await serverInstance.run();
        console.error("[ELECTRON-MCP] MCP server running");
    }
    catch (error) {
        console.error("[ELECTRON-MCP] Fatal MCP Server Error:", error);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map