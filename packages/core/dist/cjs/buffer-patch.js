"use strict";
/**
 * Patch for MCP SDK v1.13.3 buffer handling issue with Node.js v24
 * This ensures that buffers are properly handled in the StdioServerTransport
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMCPBufferPatch = applyMCPBufferPatch;
exports.ensureBuffer = ensureBuffer;
// Store original Buffer methods
const originalConcat = Buffer.concat;
const originalFrom = Buffer.from;
// Ensure Buffer.concat always returns a proper Buffer instance
if (typeof Buffer.concat === 'function') {
    Buffer.concat = function (list, totalLength) {
        // Convert any Uint8Array instances to proper Buffers
        const bufferList = list.map(item => Buffer.isBuffer(item) ? item : Buffer.from(item));
        return originalConcat.call(Buffer, bufferList, totalLength);
    };
}
// Ensure Buffer.from handles edge cases
if (typeof Buffer.from === 'function') {
    const originalBufferFrom = Buffer.from;
    Buffer.from = function (...args) {
        try {
            return originalBufferFrom.apply(Buffer, args);
        }
        catch (error) {
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
const BufferPrototype = Buffer.prototype;
// Ensure Buffer instances have subarray method (which is standard in modern Node.js)
if (!BufferPrototype.subarray && BufferPrototype.slice) {
    console.error('[BUFFER-PATCH] Adding subarray method to Buffer prototype');
    BufferPrototype.subarray = function (start, end) {
        return this.slice(start, end);
    };
}
// Hook into the MCP SDK's ReadBuffer to ensure proper buffer handling
let patchApplied = false;
function applyMCPBufferPatch() {
    if (patchApplied)
        return;
    try {
        // The MCP SDK creates ReadBuffer instances that might not handle buffers correctly
        // We'll patch the global Buffer to ensure compatibility
        // Monkey-patch process.stdin's data event to ensure chunks are Buffers
        const originalEmit = process.stdin.emit;
        process.stdin.emit = function (event, ...args) {
            if (event === 'data' && args[0]) {
                // Ensure the chunk is a proper Buffer
                if (!Buffer.isBuffer(args[0])) {
                    console.error('[BUFFER-PATCH] Converting stdin chunk to Buffer, type:', typeof args[0]);
                    args[0] = Buffer.from(args[0]);
                }
            }
            return originalEmit.apply(this, [event, ...args]);
        };
        console.error('[BUFFER-PATCH] MCP buffer compatibility patch applied');
        patchApplied = true;
    }
    catch (error) {
        console.error('[BUFFER-PATCH] Failed to apply patch:', error);
    }
}
// Apply patch immediately
applyMCPBufferPatch();
function ensureBuffer(data) {
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
//# sourceMappingURL=buffer-patch.js.map