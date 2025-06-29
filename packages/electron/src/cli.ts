#!/usr/bin/env node

import { Command } from "commander";
import { ElectronDriver } from "./electron-driver.js";
import { ElectronMCPServer } from "./electron-server.js";

// Handle unhandled rejections gracefully to avoid closing MCP transport
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit - let MCP server handle errors gracefully
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Only exit on truly fatal errors, not on launch failures
  if (error.message && error.message.includes('MCP Server')) {
    process.exit(1);
  }
});

const program = new Command();

program
  .name("circuit-electron")
  .description("Snowfort Circuit Electron MCP - Computer use for webapps and electron apps")
  .version("0.0.1")
  .option("--name <name>", "Server name for MCP handshake", "circuit-electron")
  .action(async (options) => {
    try {
      const server = new ElectronMCPServer(options.name, "0.0.1");
      await server.run();
    } catch (error) {
      console.error("Fatal MCP Server Error:", error);
      process.exit(1);
    }
  });

program.parse();