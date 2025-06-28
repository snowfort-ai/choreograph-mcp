#!/usr/bin/env node

import { Command } from "commander";
import { WebDriver } from "./web-driver.js";
import { WebMCPServer } from "./web-server.js";

const program = new Command();

program
  .name("sfcg-web")
  .description("Snowfort Choreograph Web MCP - Programmatic browser control for testing and validation of web applications")
  .version("0.2.0")
  .option("--port <port>", "Port to listen on (stdio mode only)")
  .option("--browser <browser>", "Default browser engine", "chromium")
  .option("--headed", "Run in headed mode by default")
  .option("--name <name>", "Server name for MCP handshake", "sfcg-web")
  .action(async (options) => {
    const server = new WebMCPServer(options.name, "0.2.0");
    await server.run();
  });

program.parse();