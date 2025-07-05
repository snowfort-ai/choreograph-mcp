#!/usr/bin/env node

// Apply buffer patch for Node.js v24 compatibility before any MCP imports
import "@snowfort/circuit-core/buffer-patch.js";

import { Command } from "commander";
import { ElectronDriver } from "./electron-driver.js";
import { ElectronMCPServer } from "./electron-server.js";

// Track server instance to handle cleanup
let serverInstance: ElectronMCPServer | null = null;

// Handle unhandled rejections gracefully to avoid closing MCP transport
process.on("unhandledRejection", (reason, promise) => {
  console.error("[ELECTRON-MCP] Unhandled Rejection at:", promise, "reason:", reason);
  console.error("[ELECTRON-MCP] MCP transport will remain active despite this error");
  // Never exit on unhandled rejections - they should not crash the MCP
});

process.on("uncaughtException", (error) => {
  console.error("[ELECTRON-MCP] Uncaught Exception:", error);
  console.error("[ELECTRON-MCP] Error stack:", error.stack);
  
  // Be more conservative about what constitutes a "fatal" error
  if (error.message && (
    error.message.includes('MCP Server failed to start') ||
    error.message.includes('Transport initialization failed') ||
    error.message.includes('EADDRINUSE') // Port conflicts
  )) {
    console.error("[ELECTRON-MCP] Fatal server error detected, exiting...");
    process.exit(1);
  } else {
    console.error("[ELECTRON-MCP] Non-fatal exception caught, MCP transport will remain active");
    // Don't exit for app launch failures, timeouts, or other recoverable errors
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
  .version("0.0.17")
  .option("--name <name>", "Server name for MCP handshake", "circuit-electron")
  .action(async (options) => {
    try {
      console.error("[ELECTRON-MCP] Starting MCP server...");
      serverInstance = new ElectronMCPServer(options.name, "0.0.17");
      await serverInstance.run();
      console.error("[ELECTRON-MCP] MCP server running");
    } catch (error) {
      console.error("[ELECTRON-MCP] Fatal MCP Server Error:", error);
      process.exit(1);
    }
  });

program.parse();