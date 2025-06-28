#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const electron_server_js_1 = require("./electron-server.js");
const program = new commander_1.Command();
program
    .name("sfcg-electron")
    .description("Snowfort Choreograph Electron MCP - Programmatic control of Electron apps for testing and validation")
    .version("0.1.0")
    .option("--name <name>", "Server name for MCP handshake", "sfcg-electron")
    .action(async (options) => {
    const server = new electron_server_js_1.ElectronMCPServer(options.name, "0.1.0");
    await server.run();
});
program.parse();
//# sourceMappingURL=cli.js.map