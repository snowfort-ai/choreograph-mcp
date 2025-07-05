#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[34m🧪 Circuit Web MCP Local Test\x1b[0m');
console.log('\x1b[34m============================\x1b[0m');

const mcpPath = path.resolve(__dirname, 'packages/web/dist/esm/cli.js');
console.log(`\x1b[33m\n📍 MCP Path: ${mcpPath}\x1b[0m`);

console.log('\x1b[32m\n🚀 Starting MCP server...\x1b[0m');

const mcp = spawn('node', [mcpPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

let responseBuffer = '';

mcp.stdout.on('data', (data) => {
  const text = data.toString();
  responseBuffer += text;
});

mcp.stderr.on('data', (data) => {
  console.log('\x1b[35m[MCP] ' + data.toString().trim() + '\x1b[0m');
});

mcp.on('error', (error) => {
  console.error('\x1b[31m\n❌ Failed to start MCP:\x1b[0m', error);
  process.exit(1);
});

// Send test initialization
console.log('\x1b[33m\n📝 Sending test initialization...\x1b[0m');

const initRequest = {
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  },
  id: 1
};

mcp.stdin.write(JSON.stringify(initRequest) + '\n');

// Give it time to respond
setTimeout(() => {
  // Parse response
  const lines = responseBuffer.split('\n');
  for (const line of lines) {
    if (line.trim() && line.includes('jsonrpc')) {
      try {
        const response = JSON.parse(line);
        console.log('\x1b[32m\n📨 Response:\x1b[0m', JSON.stringify(response, null, 2));
        
        if (response.result && response.result.serverInfo) {
          console.log('\x1b[33m\n🔧 Listing available tools...\x1b[0m');
          
          const listRequest = {
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 2
          };
          
          responseBuffer = '';
          mcp.stdin.write(JSON.stringify(listRequest) + '\n');
          
          setTimeout(() => {
            const lines2 = responseBuffer.split('\n');
            for (const line2 of lines2) {
              if (line2.trim() && line2.includes('jsonrpc')) {
                try {
                  const toolsResponse = JSON.parse(line2);
                  console.log('\x1b[32m\n📨 Response:\x1b[0m', JSON.stringify(toolsResponse, null, 2));
                  
                  if (toolsResponse.result && toolsResponse.result.tools) {
                    console.log('\x1b[32m\n✅ MCP is working correctly!\x1b[0m');
                    console.log(`\x1b[34m\n📋 Available tools: ${toolsResponse.result.tools.length}\x1b[0m`);
                    toolsResponse.result.tools.forEach(tool => {
                      console.log(`\x1b[34m   - ${tool.name}: ${tool.description}\x1b[0m`);
                    });
                  }
                } catch (e) {}
              }
            }
            
            // Clean exit
            mcp.kill();
            process.exit(0);
          }, 1000);
        }
      } catch (e) {}
    }
  }
}, 1000);

// Timeout
setTimeout(() => {
  console.error('\x1b[31m\n❌ Test timed out\x1b[0m');
  mcp.kill();
  process.exit(1);
}, 5000);