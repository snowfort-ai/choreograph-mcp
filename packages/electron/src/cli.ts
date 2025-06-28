#!/usr/bin/env node

import { Command } from "commander";
import { ElectronDriver } from "./electron-driver.js";
import { ElectronMCPServer } from "./electron-server.js";

const program = new Command();

program
  .name("sfcg-electron")
  .description("Snowfort Choreograph Electron MCP - Programmatic control of Electron apps for testing and validation")
  .version("0.1.0")
  .option("--name <name>", "Server name for MCP handshake", "sfcg-electron")
  .action(async (options) => {
    const server = new ElectronMCPServer(options.name, "0.1.0");
    await server.run();
  });

program.parse();