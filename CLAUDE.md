## Debugging

- When trying to debug local usage of MCPs by a given project, logs can be found at the following path: /Users/<username>/Library/Caches/claude-cli-nodejs/<projectname>

## Testing MCPs Locally

**IMPORTANT: Always test MCPs locally before publishing to npm**

1. **Build the packages first:**
   ```bash
   npm run build
   ```

2. **Run the local test script:**
   ```bash
   node test-local-mcp.js
   ```
   This validates that the MCP server starts correctly and responds to initialization.

3. **Common issues to check:**
   - TypeScript compilation errors - fix before publishing
   - Module resolution issues (CommonJS vs ESM) - avoid adding `"type": "module"` to package.json
   - Workspace dependencies - replace `"workspace:*"` with actual version numbers before publishing

## Known Issues and Solutions

1. **Electron Window Detection Timeout**
   - Some Electron apps take longer than 30 seconds to create windows
   - Use the `windowTimeout` option in `app_launch` (default: 60000ms)
   - Example: `windowTimeout: 120000` for 2-minute timeout

2. **Playwright Version Mismatch**
   - The MCP uses bundled playwright-core when project doesn't have it installed
   - This is normal and expected - not an error

3. **Connection Closed Errors**
   - Usually caused by unhandled errors in JavaScript evaluation
   - Check the detailed logs for error messages
   - Ensure proper string escaping in dynamic JavaScript code

## Version History

- v0.0.15: Added windowTimeout, enhanced logging, local test script
- v0.0.14: Fixed string escaping in smart_click
- v0.0.13: Added smart_click tool, optional snapshots, filtered snapshots
- v0.0.12: Fixed workspace dependency issues for npm publishing
- v0.0.11: Fixed CommonJS/ESM module conflicts