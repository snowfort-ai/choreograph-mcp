#!/usr/bin/env node
import { Command } from "commander";
import { ElectronMCPServer } from "./electron-server.js";
// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
});
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});
const program = new Command();
program
    .name("sfcg-electron")
    .description("Snowfort Choreograph Electron MCP - Programmatic control of Electron apps for testing and validation")
    .version("0.2.2")
    .option("--name <name>", "Server name for MCP handshake", "sfcg-electron")
    .action(async (options) => {
    try {
        const server = new ElectronMCPServer(options.name, "0.2.2");
        await server.run();
    }
    catch (error) {
        console.error("MCP Server Error:", error);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map