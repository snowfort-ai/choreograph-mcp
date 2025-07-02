#!/usr/bin/env node

/**
 * Local test script for the Circuit Electron MCP
 * This tests the MCP server locally without needing to publish to npm
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testMCP() {
  log('🧪 Circuit Electron MCP Local Test', 'blue');
  log('================================', 'blue');
  
  // Path to the local MCP server
  const mcpPath = path.join(__dirname, 'packages', 'electron', 'dist', 'esm', 'cli.js');
  
  log(`\n📍 MCP Path: ${mcpPath}`, 'yellow');
  
  // Check if the built file exists
  const fs = require('fs');
  if (!fs.existsSync(mcpPath)) {
    log('\n❌ MCP CLI not found. Please run "npm run build" first.', 'red');
    process.exit(1);
  }
  
  // Start the MCP server
  log('\n🚀 Starting MCP server...', 'green');
  const mcpProcess = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  // Handle MCP output
  mcpProcess.stderr.on('data', (data) => {
    const output = data.toString();
    log(`[MCP] ${output.trim()}`, 'magenta');
  });
  
  mcpProcess.on('error', (error) => {
    log(`\n❌ Failed to start MCP: ${error.message}`, 'red');
    process.exit(1);
  });
  
  mcpProcess.on('close', (code) => {
    log(`\n📊 MCP process exited with code ${code}`, code === 0 ? 'green' : 'red');
  });
  
  // Wait a bit for the server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Send test commands
  log('\n📝 Sending test initialization...', 'yellow');
  
  // MCP handshake
  const initMessage = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    },
    id: 1
  };
  
  mcpProcess.stdin.write(JSON.stringify(initMessage) + '\n');
  
  // Wait for response
  const rl = readline.createInterface({
    input: mcpProcess.stdout,
    crlfDelay: Infinity
  });
  
  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      log(`\n📨 Response: ${JSON.stringify(response, null, 2)}`, 'green');
      
      // If initialization successful, list tools
      if (response.id === 1 && response.result) {
        log('\n🔧 Listing available tools...', 'yellow');
        const listToolsMessage = {
          jsonrpc: "2.0",
          method: "tools/list",
          params: {},
          id: 2
        };
        mcpProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');
      }
      
      // If tools listed, we're done
      if (response.id === 2 && response.result) {
        log('\n✅ MCP is working correctly!', 'green');
        log(`\n📋 Available tools: ${response.result.tools.length}`, 'blue');
        response.result.tools.forEach(tool => {
          log(`   - ${tool.name}: ${tool.description}`, 'blue');
        });
        
        // Clean exit
        setTimeout(() => {
          mcpProcess.kill();
          process.exit(0);
        }, 1000);
      }
    } catch (e) {
      // Not JSON, probably debug output
    }
  });
  
  // Handle timeouts
  setTimeout(() => {
    log('\n⏱️  Test timeout - MCP might not be responding correctly', 'red');
    mcpProcess.kill();
    process.exit(1);
  }, 10000);
}

// Run the test
testMCP().catch(error => {
  log(`\n❌ Test failed: ${error.message}`, 'red');
  process.exit(1);
});