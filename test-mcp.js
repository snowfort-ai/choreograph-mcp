#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing MCP server...');

const server = spawn('node', ['packages/electron/dist/esm/cli.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
  responseBuffer += data.toString();
});

server.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

server.on('error', (error) => {
  console.error('Process error:', error);
});

server.on('close', (code) => {
  console.log('Process exited with code:', code);
});

// Send initialize request
const initRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
}) + '\n';

console.log('Sending:', initRequest);
server.stdin.write(initRequest);

// Wait for response
setTimeout(() => {
  console.log('Response buffer:', responseBuffer);
  if (!responseBuffer) {
    console.log('No response received!');
  }
  
  // Send shutdown
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "shutdown"
  }) + '\n');
  
  setTimeout(() => {
    server.kill();
  }, 1000);
}, 3000);