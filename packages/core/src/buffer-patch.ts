/**
 * Patch for MCP SDK v1.13.3 buffer handling issue with Node.js v24
 * This ensures that buffers are properly handled in the StdioServerTransport
 */

// Store original Buffer methods
const originalConcat = Buffer.concat;
const originalFrom = Buffer.from;

// Ensure Buffer.concat always returns a proper Buffer instance
if (typeof Buffer.concat === 'function') {
  Buffer.concat = function(list: readonly Uint8Array[], totalLength?: number): Buffer {
    // Convert any Uint8Array instances to proper Buffers
    const bufferList = list.map(item => 
      Buffer.isBuffer(item) ? item : Buffer.from(item)
    );
    return originalConcat.call(Buffer, bufferList, totalLength);
  };
}

// Ensure Buffer.from handles edge cases
if (typeof Buffer.from === 'function') {
  const originalBufferFrom = Buffer.from;
  (Buffer as any).from = function(...args: any[]): Buffer {
    try {
      return originalBufferFrom.apply(Buffer, args as any);
    } catch (error) {
      // Fallback for edge cases
      if (args[0] && typeof args[0] === 'object' && args[0].buffer) {
        // Handle ArrayBuffer views
        return originalBufferFrom(args[0].buffer, args[0].byteOffset, args[0].byteLength);
      }
      throw error;
    }
  };
}

// Global Buffer prototype patch to ensure subarray method exists
const BufferPrototype = Buffer.prototype as any;

// Ensure Buffer instances have subarray method (which is standard in modern Node.js)
if (!BufferPrototype.subarray && BufferPrototype.slice) {
  console.error('[BUFFER-PATCH] Adding subarray method to Buffer prototype');
  BufferPrototype.subarray = function(start?: number, end?: number) {
    return this.slice(start, end);
  };
}

// Hook into the MCP SDK's ReadBuffer to ensure proper buffer handling
let patchApplied = false;

export function applyMCPBufferPatch() {
  if (patchApplied) return;
  
  try {
    // The MCP SDK creates ReadBuffer instances that might not handle buffers correctly
    // We'll patch the global Buffer to ensure compatibility
    
    // Monkey-patch process.stdin's data event to ensure chunks are Buffers
    const originalEmit = process.stdin.emit;
    (process.stdin as any).emit = function(event: string, ...args: any[]) {
      if (event === 'data' && args[0]) {
        // Ensure the chunk is a proper Buffer
        if (!Buffer.isBuffer(args[0])) {
          console.error('[BUFFER-PATCH] Converting stdin chunk to Buffer, type:', typeof args[0]);
          args[0] = Buffer.from(args[0]);
        }
      }
      return originalEmit.apply(this, [event, ...args] as any);
    };
    
    console.error('[BUFFER-PATCH] MCP buffer compatibility patch applied');
    patchApplied = true;
  } catch (error) {
    console.error('[BUFFER-PATCH] Failed to apply patch:', error);
  }
}

// Apply patch immediately
applyMCPBufferPatch();

export function ensureBuffer(data: any): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }
  if (typeof data === 'string') {
    return Buffer.from(data, 'utf8');
  }
  if (data && data.buffer instanceof ArrayBuffer) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  return Buffer.from(data);
}