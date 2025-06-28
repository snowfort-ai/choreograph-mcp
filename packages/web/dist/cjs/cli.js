#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const web_server_js_1 = require("./web-server.js");
// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
});
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});
const program = new commander_1.Command();
program
    .name("sfcg-web")
    .description("Snowfort Choreograph Web MCP - Programmatic browser control for testing and validation of web applications")
    .version("0.2.3")
    .option("--port <port>", "Port to listen on (stdio mode only)")
    .option("--browser <browser>", "Default browser engine", "chromium")
    .option("--headed", "Run in headed mode by default")
    .option("--name <name>", "Server name for MCP handshake", "sfcg-web")
    .action(async (options) => {
    try {
        const server = new web_server_js_1.WebMCPServer(options.name, "0.2.3");
        await server.run();
    }
    catch (error) {
        console.error("MCP Server Error:", error);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map