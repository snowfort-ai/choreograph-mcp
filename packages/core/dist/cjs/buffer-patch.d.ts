/**
 * Patch for MCP SDK v1.13.3 buffer handling issue with Node.js v24
 * This ensures that buffers are properly handled in the StdioServerTransport
 */
export declare function applyMCPBufferPatch(): void;
export declare function ensureBuffer(data: any): Buffer;
//# sourceMappingURL=buffer-patch.d.ts.map