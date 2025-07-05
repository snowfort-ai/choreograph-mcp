// Import from playwright-core (will be overridden with project version)
import { _electron as electronDefault } from "playwright-core";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as os from "os";
const execAsync = promisify(exec);
export class ElectronDriver {
    devServerProcesses = new Map();
    async killProcessesOnPorts(ports) {
        const promises = ports.map(async (port) => {
            try {
                // Use lsof to find processes using the port
                const { stdout } = await execAsync(`lsof -ti:${port}`);
                const pids = stdout.trim().split('\n').filter(pid => pid);
                if (pids.length > 0) {
                    // Kill each process
                    await Promise.all(pids.map(pid => execAsync(`kill -9 ${pid}`).catch(() => {
                        // Ignore errors - process might already be dead
                    })));
                    return `Killed ${pids.length} process(es) on port ${port}`;
                }
                return `No processes found on port ${port}`;
            }
            catch (error) {
                // Port not in use or lsof failed
                return `Port ${port} was free or couldn't check`;
            }
        });
        const results = await Promise.all(promises);
        // Results are logged by the caller for debugging
    }
    async getWindowType(window) {
        try {
            const title = await window.title();
            const url = await window.url();
            if (title && (title.includes('DevTools') ||
                title.includes('Developer Tools') ||
                title.startsWith('chrome-extension://') ||
                url.startsWith('devtools://'))) {
                return 'devtools';
            }
            if (title === 'about:blank' || !title) {
                return 'other';
            }
            return 'main';
        }
        catch {
            return 'other';
        }
    }
    async getMainWindow(electronApp, timeout = 10000) {
        const startTime = Date.now();
        console.error(`[ELECTRON-DRIVER] Waiting for main window (timeout: ${timeout}ms)...`);
        while (Date.now() - startTime < timeout) {
            const windows = await electronApp.windows();
            console.error(`[ELECTRON-DRIVER] Found ${windows.length} windows`);
            for (const window of windows) {
                const windowType = await this.getWindowType(window);
                let title = 'unknown';
                let url = 'unknown';
                try {
                    title = await window.title();
                }
                catch (e) {
                    // Window might be closed or not ready
                }
                try {
                    url = await window.url();
                }
                catch (e) {
                    // Window might be closed or not ready
                }
                console.error(`[ELECTRON-DRIVER] Window: type=${windowType}, title="${title}", url="${url}"`);
                if (windowType === 'main') {
                    console.error(`[ELECTRON-DRIVER] ✓ Found main window`);
                    return window;
                }
            }
            // Wait a bit before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.error(`[ELECTRON-DRIVER] No main window found after ${timeout}ms, falling back to firstWindow()`);
        // Fallback to firstWindow if no main window found
        try {
            const firstWindow = await electronApp.firstWindow();
            console.error(`[ELECTRON-DRIVER] ✓ Got first window via fallback`);
            return firstWindow;
        }
        catch (error) {
            console.error(`[ELECTRON-DRIVER] ✗ firstWindow() failed:`, error);
            throw error;
        }
    }
    async startDevServer(projectPath, startScript) {
        return new Promise((resolve, reject) => {
            const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            const devServerProcess = spawn(npmCmd, ['run', startScript], {
                cwd: projectPath,
                stdio: 'pipe',
                shell: true,
            });
            let output = '';
            let errorOutput = '';
            let resolved = false;
            // Set a timeout for server startup with progress updates
            let progressCount = 0;
            const progressInterval = setInterval(() => {
                if (!resolved) {
                    progressCount++;
                    // Log progress every 5 seconds
                    if (progressCount % 5 === 0) {
                        console.error(`[Dev Server] Waiting for startup... ${progressCount}s elapsed`);
                        if (output.trim()) {
                            console.error(`[Dev Server] Last output: ${output.split('\n').slice(-3).join('\n')}`);
                        }
                    }
                }
            }, 1000);
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    clearInterval(progressInterval);
                    devServerProcess.kill();
                    reject(new Error(`Dev server startup timeout after 30 seconds. Last output: ${output}`));
                }
            }, 30000);
            devServerProcess.stdout?.on('data', (data) => {
                const chunk = data.toString();
                output += chunk;
                // Look for common "ready" patterns
                if (!resolved && (chunk.includes('Compiled successfully') ||
                    chunk.includes('webpack compiled successfully') ||
                    chunk.includes('Webpack compiled successfully') ||
                    chunk.includes('Main window is ready') ||
                    chunk.includes('Electron Forge webpack output') ||
                    chunk.includes('App ready') ||
                    chunk.includes('Dev server is running') ||
                    // Electron Forge specific patterns
                    chunk.includes('✔ Compiling Renderer Process Code') ||
                    chunk.includes('✔ Launching Application') ||
                    chunk.includes('✔ Running preStart hook') ||
                    chunk.includes('STARTUP_URL=') ||
                    chunk.includes('Renderer webpack configuration') ||
                    // App-specific patterns
                    chunk.includes('Remote debugging enabled') ||
                    chunk.includes('Starting electron app') ||
                    chunk.includes('Electron app started'))) {
                    resolved = true;
                    clearTimeout(timeout);
                    clearInterval(progressInterval);
                    // Give it a moment for the server to fully stabilize
                    setTimeout(() => resolve(devServerProcess), 2000); // Increased to 2s for Forge
                }
            });
            devServerProcess.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });
            devServerProcess.on('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    clearInterval(progressInterval);
                    reject(new Error(`Failed to start dev server: ${error.message}`));
                }
            });
            devServerProcess.on('exit', (code) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    clearInterval(progressInterval);
                    if (code !== 0) {
                        reject(new Error(`Dev server exited with code ${code}. Error output: ${errorOutput}`));
                    }
                }
            });
        });
    }
    async getElectronInstance(projectPath) {
        const debugInfo = [];
        if (!projectPath) {
            debugInfo.push(`[PLAYWRIGHT-DEBUG] No project path provided, using NPX default`);
            return { electron: electronDefault, debugInfo };
        }
        try {
            const projectPlaywrightDir = path.join(projectPath, 'node_modules', 'playwright-core');
            debugInfo.push(`[PLAYWRIGHT-DEBUG] Checking project directory: ${projectPlaywrightDir}`);
            // Check if the directory exists
            await fs.access(projectPlaywrightDir);
            debugInfo.push(`[PLAYWRIGHT-DEBUG] ✓ Project Playwright directory found`);
            // ESM requires importing specific files, not directories
            const projectPlaywrightPath = path.join(projectPlaywrightDir, 'index.js');
            debugInfo.push(`[PLAYWRIGHT-DEBUG] Importing specific file: ${projectPlaywrightPath}`);
            // Try multiple import strategies
            let projectPlaywright = null;
            // Strategy 1: ESM dynamic import (specific file)
            try {
                debugInfo.push(`[PLAYWRIGHT-DEBUG] Trying ESM dynamic import of index.js...`);
                projectPlaywright = await import(projectPlaywrightPath);
                debugInfo.push(`[PLAYWRIGHT-DEBUG] ✓ ESM dynamic import succeeded`);
            }
            catch (esmError) {
                debugInfo.push(`[PLAYWRIGHT-DEBUG] ✗ ESM dynamic import failed: ${esmError}`);
                // Strategy 2: Try alternative import methods if needed
                debugInfo.push(`[PLAYWRIGHT-DEBUG] ✗ ESM dynamic import failed, checking error...`);
                throw esmError; // For now, just throw to see if there are other issues
            }
            // Check if _electron is available (handle both CommonJS and ESM patterns)
            let electronInstance = null;
            if (projectPlaywright) {
                // Try direct access first (CommonJS pattern)
                if (projectPlaywright._electron) {
                    electronInstance = projectPlaywright._electron;
                    debugInfo.push(`[PLAYWRIGHT-DEBUG] ✓ Found _electron at top level (CommonJS style)`);
                }
                // Try default export (ESM pattern)
                else if (projectPlaywright.default && projectPlaywright.default._electron) {
                    electronInstance = projectPlaywright.default._electron;
                    debugInfo.push(`[PLAYWRIGHT-DEBUG] ✓ Found _electron in default export (ESM style)`);
                }
                // Try module.exports (mixed pattern)
                else if (projectPlaywright['module.exports'] && projectPlaywright['module.exports']._electron) {
                    electronInstance = projectPlaywright['module.exports']._electron;
                    debugInfo.push(`[PLAYWRIGHT-DEBUG] ✓ Found _electron in module.exports`);
                }
                else {
                    debugInfo.push(`[PLAYWRIGHT-DEBUG] ✗ Project Playwright loaded but missing _electron property`);
                    debugInfo.push(`[PLAYWRIGHT-DEBUG] Available top-level properties: ${Object.keys(projectPlaywright).join(', ')}`);
                    if (projectPlaywright.default) {
                        debugInfo.push(`[PLAYWRIGHT-DEBUG] Available default properties: ${Object.keys(projectPlaywright.default).slice(0, 10).join(', ')}...`);
                    }
                }
            }
            if (electronInstance) {
                debugInfo.push(`[PLAYWRIGHT-DEBUG] ✓ Successfully using project's Playwright!`);
                return { electron: electronInstance, debugInfo };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            debugInfo.push(`[PLAYWRIGHT-DEBUG] ✗ Failed to load project Playwright: ${errorMessage}`);
            // If it's just a missing file, that's expected - not an error
            if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file or directory')) {
                debugInfo.push(`[PLAYWRIGHT-DEBUG] Project doesn't have playwright-core installed (this is normal)`);
            }
        }
        debugInfo.push(`[PLAYWRIGHT-DEBUG] Using bundled Playwright from MCP`);
        return { electron: electronDefault, debugInfo };
    }
    async launch(opts) {
        if (!opts.app) {
            throw new Error("App path is required for Electron driver");
        }
        const mode = opts.mode || 'auto';
        if (mode === 'auto') {
            return await this.autoLaunch(opts);
        }
        else if (mode === 'development') {
            return await this.launchDevelopment(opts);
        }
        else {
            return await this.launchPackaged(opts);
        }
    }
    async autoLaunch(opts) {
        try {
            // Try packaged first (most common)
            if (await this.isPackagedApp(opts.app)) {
                return await this.launchPackaged(opts);
            }
            // Try development mode if we have a project path or if app looks like a directory
            if (opts.projectPath || await this.looksLikeProject(opts.app)) {
                const projectPath = opts.projectPath || opts.app;
                if (await this.hasPackageJson(projectPath)) {
                    return await this.launchDevelopment({ ...opts, projectPath });
                }
            }
            // Fallback to packaged launch
            return await this.launchPackaged(opts);
        }
        catch (error) {
            throw new Error(`Auto-launch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async launchDevelopment(opts) {
        const projectPath = opts.projectPath || opts.app;
        const { electron } = await this.getElectronInstance(projectPath);
        // Validate project path exists
        try {
            await fs.stat(projectPath);
        }
        catch (error) {
            throw new Error(`Project path does not exist or is not accessible: ${projectPath}. Error: ${error}`);
        }
        // Check for package.json
        const packageJsonPath = path.join(projectPath, 'package.json');
        let packageJsonContent;
        try {
            await fs.stat(packageJsonPath);
            packageJsonContent = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        }
        catch (error) {
            throw new Error(`No valid package.json found in ${projectPath}. Error: ${error}`);
        }
        // Check for Electron Forge project
        const isForgeProject = await this.isElectronForgeProject(projectPath, packageJsonContent);
        if (isForgeProject) {
            return await this.launchElectronForgeProject(opts, projectPath, packageJsonContent);
        }
        // Find Electron executable
        let electronPath;
        let execDebugInfo = [];
        if (opts.electronPath) {
            electronPath = opts.electronPath;
            execDebugInfo.push(`[EXEC-DEBUG] Using provided electronPath: ${electronPath}`);
        }
        else {
            const execResult = await this.findElectronExecutable(projectPath);
            electronPath = execResult.path;
            execDebugInfo = execResult.debugInfo;
        }
        // Validate Electron executable
        try {
            await fs.stat(electronPath);
        }
        catch (error) {
            throw new Error(`Electron executable not accessible: ${electronPath}. Error: ${error}`);
        }
        // Prepare launch configuration
        // IMPORTANT: Do NOT pass env parameter unless absolutely necessary
        // Playwright's electron.launch replaces the entire environment when env is provided
        const launchConfig = {
            executablePath: electronPath,
            args: ['.'],
            cwd: projectPath,
            timeout: opts.timeout || 30000,
        };
        // Add DevTools control if requested
        if (opts.disableDevtools) {
            launchConfig.args = [...(launchConfig.args || []), '--disable-dev-tools'];
        }
        // Only add env if user explicitly provided environment variables
        if (opts.env && Object.keys(opts.env).length > 0) {
            // Must include process.env to avoid breaking Electron
            launchConfig.env = { ...process.env, ...opts.env, NODE_ENV: 'development' };
        }
        // Launch Electron application
        const electronApp = await electron.launch(launchConfig);
        // Wait for main window
        const mainWindow = await this.getMainWindow(electronApp, opts.windowTimeout || 60000);
        const windows = new Map();
        if (mainWindow) {
            windows.set("main", mainWindow);
        }
        // Create and return session
        const session = {
            id: randomUUID(),
            electronApp,
            mainWindow,
            windows,
            options: { ...opts, compressScreenshots: opts.compressScreenshots ?? true },
            networkRequests: [],
            consoleMessages: [],
        };
        // Set up monitoring if we have a main window
        if (mainWindow) {
            this.setupPageMonitoring(mainWindow, session);
        }
        return session;
    }
    async launchPackaged(opts) {
        const { electron } = await this.getElectronInstance();
        // Build launch config without env by default
        const launchConfig = {
            executablePath: opts.app,
            args: opts.args || [],
            cwd: opts.cwd,
            timeout: opts.timeout || 30000,
        };
        // Add DevTools control if requested
        if (opts.disableDevtools) {
            launchConfig.args = [...launchConfig.args, '--disable-dev-tools'];
        }
        // Only add env if explicitly provided and non-empty
        if (opts.env && Object.keys(opts.env).length > 0) {
            launchConfig.env = { ...process.env, ...opts.env };
        }
        const electronApp = await electron.launch(launchConfig);
        const mainWindow = await this.getMainWindow(electronApp, opts.windowTimeout || 60000);
        const windows = new Map();
        if (mainWindow) {
            windows.set("main", mainWindow);
        }
        const session = {
            id: randomUUID(),
            electronApp,
            mainWindow,
            windows,
            options: { ...opts, compressScreenshots: opts.compressScreenshots ?? true },
            networkRequests: [],
            consoleMessages: [],
        };
        // Set up monitoring if we have a main window
        if (mainWindow) {
            this.setupPageMonitoring(mainWindow, session);
        }
        return session;
    }
    async isElectronForgeProject(projectPath, packageJsonContent) {
        // Check for Forge configuration in package.json
        const hasForgeConfig = packageJsonContent.config && packageJsonContent.config.forge;
        if (hasForgeConfig) {
            return true;
        }
        // Check for Forge dev dependencies
        const devDeps = packageJsonContent.devDependencies || {};
        const hasForgeDevDep = Object.keys(devDeps).some(dep => dep.includes('@electron-forge/'));
        if (hasForgeDevDep) {
            return true;
        }
        // Check for Forge scripts
        const scripts = packageJsonContent.scripts || {};
        const hasForgeScript = Object.values(scripts).some((script) => typeof script === 'string' && script.includes('electron-forge'));
        if (hasForgeScript) {
            return true;
        }
        // Check for Forge config files
        const forgeFiles = ['forge.config.js', 'forge.config.ts'];
        for (const file of forgeFiles) {
            try {
                await fs.access(path.join(projectPath, file));
                return true;
            }
            catch {
                // File doesn't exist
            }
        }
        return false;
    }
    async launchElectronForgeProject(opts, projectPath, packageJsonContent) {
        let electronApp;
        let devServerProcess;
        let allDebugInfo = [];
        try {
            // Start dev server if startScript is provided
            if (opts.startScript) {
                allDebugInfo.push(`[FORGE-DEBUG] Starting dev server with script: ${opts.startScript}`);
                try {
                    devServerProcess = await this.startDevServer(projectPath, opts.startScript);
                    allDebugInfo.push(`[FORGE-DEBUG] ✓ Dev server started successfully`);
                    this.devServerProcesses.set(projectPath, devServerProcess);
                }
                catch (devServerError) {
                    allDebugInfo.push(`[FORGE-DEBUG] ✗ Failed to start dev server: ${devServerError}`);
                    // Check if it's a port conflict and auto-recovery is enabled
                    const errorMessage = devServerError instanceof Error ? devServerError.message : String(devServerError);
                    const isPortConflict = errorMessage.includes('EADDRINUSE') || errorMessage.includes('address already in use');
                    const shouldRetry = opts.killPortConflicts !== false; // Default to true unless explicitly disabled
                    if (isPortConflict && shouldRetry) {
                        allDebugInfo.push(`[FORGE-DEBUG] Port conflict detected - attempting to kill existing processes and retry`);
                        try {
                            // Try to extract the specific port from the error message
                            const portMatch = errorMessage.match(/:(\d+)/);
                            const conflictingPort = portMatch ? parseInt(portMatch[1]) : null;
                            if (conflictingPort) {
                                allDebugInfo.push(`[FORGE-DEBUG] Detected port conflict on port ${conflictingPort}, killing processes on that port only`);
                                await this.killProcessesOnPorts([conflictingPort]);
                            }
                            else {
                                // Fallback to common Electron Forge ports if we can't detect the specific port
                                allDebugInfo.push(`[FORGE-DEBUG] Could not detect specific port, trying common Electron Forge ports`);
                                await this.killProcessesOnPorts([9000, 9001, 9002]);
                            }
                            allDebugInfo.push(`[FORGE-DEBUG] Killed processes on conflicting ports, retrying dev server start`);
                            // Wait a moment for ports to be freed
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            // Retry starting the dev server
                            devServerProcess = await this.startDevServer(projectPath, opts.startScript);
                            allDebugInfo.push(`[FORGE-DEBUG] ✓ Dev server started successfully after port cleanup`);
                            this.devServerProcesses.set(projectPath, devServerProcess);
                        }
                        catch (retryError) {
                            allDebugInfo.push(`[FORGE-DEBUG] ✗ Retry failed: ${retryError}`);
                            throw new Error(`Failed to start dev server with '${opts.startScript}' even after port cleanup: ${errorMessage}`);
                        }
                    }
                    else {
                        const hint = isPortConflict ? ' (set killPortConflicts: false to disable auto-recovery)' : '';
                        throw new Error(`Failed to start dev server with '${opts.startScript}': ${errorMessage}${hint}`);
                    }
                }
            }
            allDebugInfo.push(`[PLAYWRIGHT-DEBUG] Attempting to use project's Playwright...`);
            const { electron, debugInfo: playwrightDebugInfo } = await this.getElectronInstance(projectPath);
            allDebugInfo.push(...playwrightDebugInfo);
            // Find Electron executable
            let electronPath;
            let execDebugInfo = [];
            if (opts.electronPath) {
                electronPath = opts.electronPath;
                execDebugInfo.push(`[EXEC-DEBUG] Using provided electronPath: ${electronPath}`);
            }
            else {
                const execResult = await this.findElectronExecutable(projectPath);
                electronPath = execResult.path;
                execDebugInfo = execResult.debugInfo;
            }
            allDebugInfo.push(...execDebugInfo);
            // Add execution context debugging 
            allDebugInfo.push(`[CONTEXT-DEBUG] === EXECUTION CONTEXT ===`);
            allDebugInfo.push(`[CONTEXT-DEBUG] MCP process.cwd(): ${process.cwd()}`);
            allDebugInfo.push(`[CONTEXT-DEBUG] MCP module context: ESM/CommonJS`);
            allDebugInfo.push(`[CONTEXT-DEBUG] Node.js version: ${process.version}`);
            allDebugInfo.push(`[CONTEXT-DEBUG] Platform: ${process.platform} ${process.arch}`);
            // Get Playwright version (simplified for compatibility)
            try {
                // Use dynamic import without JSON attributes to avoid compatibility issues
                const playwrightModule = await import('playwright-core');
                allDebugInfo.push(`[CONTEXT-DEBUG] Playwright module loaded successfully`);
                // Try to get version from the module itself if available
                if ('version' in playwrightModule) {
                    allDebugInfo.push(`[CONTEXT-DEBUG] Playwright version: ${playwrightModule.version}`);
                }
                else {
                    allDebugInfo.push(`[CONTEXT-DEBUG] Playwright version: not exposed in module`);
                }
            }
            catch (e) {
                allDebugInfo.push(`[CONTEXT-DEBUG] Playwright module load failed: ${e}`);
            }
            // Simplified context detection
            allDebugInfo.push(`[CONTEXT-DEBUG] Module context: Running from NPX cache (different from project)`);
            allDebugInfo.push(`[CONTEXT-DEBUG] Key insight: NPX-cached Playwright vs project Playwright`);
            allDebugInfo.push(`[CONTEXT-DEBUG] === END CONTEXT ===`);
            // Prepare Forge-specific launch configuration
            // CRITICAL: Do NOT pass env parameter unless user explicitly needs it
            // Playwright's electron.launch completely replaces process.env when env is specified
            const launchConfig = {
                executablePath: electronPath,
                args: ['.'], // Use current directory for Forge projects
                cwd: projectPath,
                timeout: opts.timeout || 60000, // Longer timeout for Forge projects (webpack can be slow)
            };
            // Add DevTools control if requested
            if (opts.disableDevtools) {
                launchConfig.args = [...(launchConfig.args || []), '--disable-dev-tools'];
            }
            // Only add env if user explicitly provided environment variables
            if (opts.env && Object.keys(opts.env).length > 0) {
                // Must include full process.env to preserve system paths and variables
                launchConfig.env = { ...process.env, ...opts.env, NODE_ENV: 'development' };
            }
            // Collect detailed launch parameters for debugging
            allDebugInfo.push(`[FORGE-DEBUG] Launch Config:`);
            allDebugInfo.push(`  executablePath: ${launchConfig.executablePath}`);
            allDebugInfo.push(`  args: ${JSON.stringify(launchConfig.args)}`);
            allDebugInfo.push(`  cwd: ${launchConfig.cwd}`);
            allDebugInfo.push(`  timeout: ${launchConfig.timeout}`);
            allDebugInfo.push(`  env keys: ${launchConfig.env ? Object.keys(launchConfig.env).join(', ') : 'none (using default process.env)'}`);
            // Verify executable exists and is accessible
            try {
                const { promises: fs } = await import('fs');
                await fs.access(electronPath);
                allDebugInfo.push(`[FORGE-DEBUG] ✓ Electron executable verified: ${electronPath}`);
            }
            catch (accessError) {
                allDebugInfo.push(`[FORGE-DEBUG] ✗ Electron executable access failed: ${accessError}`);
                throw new Error(`Electron executable not accessible: ${electronPath}. Debug: ${allDebugInfo.join('; ')}`);
            }
            // Verify project directory
            allDebugInfo.push(`[FORGE-DEBUG] Project directory: ${projectPath}`);
            allDebugInfo.push(`[FORGE-DEBUG] Working directory: ${process.cwd()}`);
            // Test basic Playwright functionality first
            allDebugInfo.push(`[FORGE-DEBUG] Testing basic Playwright functionality...`);
            try {
                // Simple test - just check if _electron exists and has launch method
                if (typeof electron.launch === 'function') {
                    allDebugInfo.push(`[FORGE-DEBUG] ✓ Playwright _electron.launch is available`);
                }
                else {
                    allDebugInfo.push(`[FORGE-DEBUG] ✗ Playwright _electron.launch is not a function: ${typeof electron.launch}`);
                }
            }
            catch (testError) {
                allDebugInfo.push(`[FORGE-DEBUG] ✗ Basic Playwright test failed: ${testError}`);
            }
            // Launch the Forge application
            allDebugInfo.push(`[FORGE-DEBUG] Attempting electron.launch...`);
            try {
                electronApp = await electron.launch(launchConfig);
                allDebugInfo.push(`[FORGE-DEBUG] ✓ electron.launch succeeded`);
            }
            catch (launchError) {
                allDebugInfo.push(`[FORGE-DEBUG] ✗ electron.launch failed: ${launchError}`);
                // If relative path failed, try with absolute path as fallback
                if (electronPath.startsWith('./')) {
                    allDebugInfo.push(`[FORGE-DEBUG] Retrying with absolute path...`);
                    const absolutePath = path.resolve(projectPath, electronPath.substring(2));
                    allDebugInfo.push(`[FORGE-DEBUG] Absolute path: ${absolutePath}`);
                    const retryConfig = { ...launchConfig, executablePath: absolutePath };
                    allDebugInfo.push(`[FORGE-DEBUG] Retry config: executablePath=${retryConfig.executablePath}`);
                    try {
                        electronApp = await electron.launch(retryConfig);
                        allDebugInfo.push(`[FORGE-DEBUG] ✓ Absolute path retry succeeded!`);
                    }
                    catch (retryError) {
                        allDebugInfo.push(`[FORGE-DEBUG] ✗ Absolute path retry also failed: ${retryError}`);
                        throw launchError; // Throw original error
                    }
                }
                else {
                    throw launchError;
                }
            }
            // Ensure electronApp was successfully created
            if (!electronApp) {
                throw new Error('Failed to create Electron application instance');
            }
            // Wait for main window with extended patience
            const mainWindow = await this.getMainWindow(electronApp);
            const windows = new Map();
            if (mainWindow) {
                windows.set("main", mainWindow);
            }
            // Create session
            const session = {
                id: randomUUID(),
                electronApp,
                mainWindow,
                windows,
                options: { ...opts, compressScreenshots: opts.compressScreenshots ?? true },
                devServerProcess,
                networkRequests: [],
                consoleMessages: [],
            };
            // Set up monitoring if we have a main window
            if (mainWindow) {
                this.setupPageMonitoring(mainWindow, session);
            }
            return session;
        }
        catch (error) {
            // Add error details to debug info
            allDebugInfo.push(`[FORGE-DEBUG] ✗ Launch failed with error: ${error instanceof Error ? error.message : String(error)}`);
            allDebugInfo.push(`[FORGE-DEBUG] Error stack: ${error instanceof Error ? error.stack : 'No stack available'}`);
            // Cleanup on failure
            if (electronApp) {
                try {
                    await electronApp.close();
                }
                catch (cleanupError) {
                    allDebugInfo.push(`[FORGE-DEBUG] Cleanup error: ${cleanupError}`);
                }
            }
            // Kill dev server if it was started
            if (devServerProcess) {
                try {
                    devServerProcess.kill();
                    this.devServerProcesses.delete(projectPath);
                }
                catch (killError) {
                    allDebugInfo.push(`[FORGE-DEBUG] Failed to kill dev server: ${killError}`);
                }
            }
            // Provide helpful error messages for common Forge issues with debug info
            const debugSummary = allDebugInfo.join('\n');
            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    throw new Error(`Forge project launch timeout. This often happens when:\n1. Webpack compilation is taking too long\n2. The main process is waiting for renderer\n3. Try increasing timeout or check Forge webpack config\n\nDEBUG INFO:\n${debugSummary}\n\nOriginal error: ${error.message}`);
                }
                else if (error.message.includes('spawn') || error.message.includes('Process failed to launch')) {
                    throw new Error(`Forge project spawn error. This often happens when:\n1. Electron executable path is wrong\n2. Main file path is incorrect\n3. File permissions issue\n4. Missing dependencies or environment variables\n\nDEBUG INFO:\n${debugSummary}\n\nOriginal error: ${error.message}`);
                }
            }
            throw new Error(`Failed to launch Electron Forge project: ${error instanceof Error ? error.message : String(error)}\n\nDEBUG INFO:\n${debugSummary}`);
        }
    }
    async isPackagedApp(appPath) {
        try {
            const stats = await fs.stat(appPath);
            // Check for common packaged app patterns
            if (stats.isFile()) {
                return appPath.endsWith('.exe') || appPath.endsWith('.app') || appPath.includes('electron');
            }
            if (stats.isDirectory()) {
                // Check if it's a .app bundle (macOS)
                if (appPath.endsWith('.app')) {
                    return true;
                }
                // Check for typical packaged structure
                try {
                    await fs.access(path.join(appPath, 'resources', 'app.asar'));
                    return true;
                }
                catch {
                    return false;
                }
            }
            return false;
        }
        catch {
            return false;
        }
    }
    async looksLikeProject(appPath) {
        try {
            const stats = await fs.stat(appPath);
            return stats.isDirectory();
        }
        catch {
            return false;
        }
    }
    async hasPackageJson(projectPath) {
        try {
            await fs.access(path.join(projectPath, 'package.json'));
            return true;
        }
        catch {
            return false;
        }
    }
    async findElectronExecutable(projectPath) {
        const debugInfo = [];
        debugInfo.push(`[EXEC-DEBUG] Finding Electron executable for project: ${projectPath}`);
        // Try relative path first (matches working manual test: './node_modules/.bin/electron')
        const relativeElectron = './node_modules/.bin/electron';
        debugInfo.push(`[EXEC-DEBUG] Checking relative path: ${relativeElectron}`);
        try {
            await fs.access(relativeElectron);
            debugInfo.push(`[EXEC-DEBUG] ✓ Found relative electron: ${relativeElectron}`);
            return { path: relativeElectron, debugInfo };
        }
        catch (e) {
            debugInfo.push(`[EXEC-DEBUG] ✗ Relative path failed: ${e}`);
        }
        // Check local node_modules with absolute path
        const localElectron = path.join(projectPath, 'node_modules', '.bin', 'electron');
        debugInfo.push(`[EXEC-DEBUG] Checking local bin: ${localElectron}`);
        try {
            await fs.access(localElectron);
            debugInfo.push(`[EXEC-DEBUG] ✓ Found local bin electron: ${localElectron}`);
            return { path: localElectron, debugInfo };
        }
        catch (e) {
            debugInfo.push(`[EXEC-DEBUG] ✗ Local bin not found: ${e}`);
        }
        // Check platform-specific paths
        const platform = os.platform();
        let electronBinary;
        if (platform === 'win32') {
            electronBinary = path.join(projectPath, 'node_modules', 'electron', 'dist', 'electron.exe');
        }
        else if (platform === 'darwin') {
            electronBinary = path.join(projectPath, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
        }
        else {
            electronBinary = path.join(projectPath, 'node_modules', 'electron', 'dist', 'electron');
        }
        debugInfo.push(`[EXEC-DEBUG] Checking platform binary: ${electronBinary}`);
        try {
            await fs.access(electronBinary);
            debugInfo.push(`[EXEC-DEBUG] ✓ Found platform binary: ${electronBinary}`);
            return { path: electronBinary, debugInfo };
        }
        catch (e) {
            debugInfo.push(`[EXEC-DEBUG] ✗ Platform binary not found: ${e}`);
        }
        // Try global electron
        debugInfo.push(`[EXEC-DEBUG] Checking global electron`);
        try {
            const { stdout } = await execAsync('which electron');
            const globalElectron = stdout.trim();
            if (globalElectron) {
                debugInfo.push(`[EXEC-DEBUG] ✓ Found global electron: ${globalElectron}`);
                return { path: globalElectron, debugInfo };
            }
        }
        catch (e) {
            debugInfo.push(`[EXEC-DEBUG] ✗ Global electron not found: ${e}`);
        }
        debugInfo.push(`[EXEC-DEBUG] ✗ No Electron executable found anywhere`);
        throw new Error(`Electron executable not found. Please install electron in ${projectPath} or globally. Debug info: ${debugInfo.join('; ')}`);
    }
    async screenshot(session, path, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const compress = electronSession.options?.compressScreenshots !== false;
        const quality = electronSession.options?.screenshotQuality || 50;
        let screenshotPath;
        if (compress) {
            screenshotPath = path || `electron-screenshot-${Date.now()}.jpeg`;
            await window.screenshot({
                path: screenshotPath,
                type: 'jpeg',
                quality: quality
            });
        }
        else {
            screenshotPath = path || `electron-screenshot-${Date.now()}.png`;
            await window.screenshot({
                path: screenshotPath,
                type: 'png'
            });
        }
        return screenshotPath;
    }
    async snapshot(session, windowId, filter) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const snapshot = await window.accessibility.snapshot();
        const enhancedSnapshot = this.enhanceSnapshotWithRefs(snapshot, filter);
        return JSON.stringify(enhancedSnapshot, null, 2);
    }
    enhanceSnapshotWithRefs(snapshot, filter) {
        if (!snapshot)
            return snapshot;
        const interactiveRoles = new Set([
            'button', 'link', 'textbox', 'textarea', 'combobox', 'listbox',
            'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'searchbox',
            'menuitem', 'menu', 'tab', 'option', 'cell', 'gridcell'
        ]);
        let refCounter = 1;
        const addRefs = (node) => {
            if (!node || typeof node !== 'object')
                return node;
            // Skip non-interactive elements when filtering
            if (filter === 'interactive' && node.role && !interactiveRoles.has(node.role.toLowerCase())) {
                // Skip this node but process its children
                if (node.children && Array.isArray(node.children)) {
                    const filteredChildren = node.children
                        .map(addRefs)
                        .filter((child) => child !== null);
                    // If this is a container with interactive children, keep it
                    if (filteredChildren.length > 0) {
                        return {
                            ...node,
                            children: filteredChildren,
                            ref: `e${refCounter++}`
                        };
                    }
                    return null;
                }
                return null;
            }
            const enhanced = { ...node };
            if (node.role && node.role !== 'WebArea' && node.role !== 'RootWebArea') {
                enhanced.ref = `e${refCounter++}`;
            }
            if (node.children && Array.isArray(node.children)) {
                enhanced.children = node.children
                    .map(addRefs)
                    .filter((child) => child !== null);
            }
            return enhanced;
        };
        return addRefs(snapshot);
    }
    async click(session, selector, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.click(selector);
    }
    async type(session, selector, text, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.fill(selector, text);
    }
    async evaluate(session, script, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        try {
            // Check if the script contains a return statement outside of a function
            // If it does, wrap it in an IIFE (Immediately Invoked Function Expression)
            const trimmedScript = script.trim();
            const hasReturnOutsideFunction = /^return\s+|[\s;]return\s+/.test(trimmedScript) &&
                !trimmedScript.startsWith('function') &&
                !trimmedScript.startsWith('(') &&
                !trimmedScript.includes('=>');
            let evalScript = script;
            if (hasReturnOutsideFunction) {
                // Wrap in IIFE to make return statement valid
                evalScript = `(() => { ${script} })()`;
            }
            // Execute the script with proper error handling
            return await window.evaluate(evalScript);
        }
        catch (error) {
            // Handle syntax errors and other evaluation errors gracefully
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Log detailed error for debugging
            console.error(`[ELECTRON-MCP] JavaScript evaluation error:`, errorMessage);
            console.error(`[ELECTRON-MCP] Script that failed:`, script);
            // Re-throw with more context
            throw new Error(`JavaScript evaluation failed: ${errorMessage}`);
        }
    }
    async waitForSelector(session, selector, timeout, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const effectiveTimeout = timeout || 30000; // Default 30 seconds
        const maxTimeout = 120000; // Max 2 minutes
        const finalTimeout = Math.min(effectiveTimeout, maxTimeout);
        try {
            await window.waitForSelector(selector, { timeout: finalTimeout });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[ELECTRON-DRIVER] waitForSelector failed after ${finalTimeout}ms:`, errorMessage);
            console.error(`[ELECTRON-DRIVER] Selector: ${selector}`);
            throw new Error(`Element not found: ${selector} (waited ${finalTimeout}ms)`);
        }
    }
    async close(session) {
        const electronSession = session;
        await electronSession.electronApp.close();
        // Clean up dev server if it exists
        if (electronSession.devServerProcess) {
            try {
                electronSession.devServerProcess.kill();
                // Remove from tracking map if we know the project path
                if (electronSession.options?.projectPath || electronSession.options?.app) {
                    const projectPath = electronSession.options.projectPath || electronSession.options.app;
                    this.devServerProcesses.delete(projectPath);
                }
            }
            catch (error) {
                // Log but don't throw - app is already closed
                console.error('Failed to kill dev server process:', error);
            }
        }
    }
    getWindow(session, windowId) {
        if (windowId && session.windows.has(windowId)) {
            return session.windows.get(windowId);
        }
        if (session.mainWindow) {
            return session.mainWindow;
        }
        throw new Error(`No window found for ID: ${windowId || 'main'}`);
    }
    // Additional methods for all the other MCP tools...
    async hover(session, selector, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.hover(selector);
    }
    async drag(session, sourceSelector, targetSelector, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.dragAndDrop(sourceSelector, targetSelector);
    }
    async key(session, key, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.keyboard.press(key);
    }
    async select(session, selector, value, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.selectOption(selector, value);
    }
    async upload(session, selector, filePath, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.setInputFiles(selector, filePath);
    }
    async back(session, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.goBack();
    }
    async forward(session, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.goForward();
    }
    async refresh(session, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.reload();
    }
    async content(session, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        return await window.content();
    }
    async textContent(session, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        return await window.textContent('body') || '';
    }
    // Electron-specific methods
    async invokeIPC(session, channel, ...args) {
        const electronSession = session;
        return await electronSession.electronApp.evaluate(({ ipcMain }, { channel, args }) => {
            return new Promise((resolve) => {
                ipcMain.handle('__mcp_test', () => {
                    const { ipcRenderer } = require('electron');
                    return ipcRenderer.invoke(channel, ...args);
                });
                resolve(require('electron').ipcMain.emit('__mcp_test'));
            });
        }, { channel, args });
    }
    async getWindows(session) {
        const electronSession = session;
        const windows = await electronSession.electronApp.windows();
        const windowInfo = [];
        for (let index = 0; index < windows.length; index++) {
            const window = windows[index];
            const type = await this.getWindowType(window);
            let title = '';
            try {
                title = await window.title();
            }
            catch {
                title = 'Unknown';
            }
            windowInfo.push({
                id: `window-${index}`,
                type: type,
                title: title
            });
        }
        return windowInfo;
    }
    async writeFile(session, filePath, content) {
        await fs.writeFile(filePath, content, 'utf8');
    }
    async readFile(session, filePath) {
        return await fs.readFile(filePath, 'utf8');
    }
    async keyboardPress(session, key, modifiers, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        if (modifiers && modifiers.length > 0) {
            const modString = modifiers.join('+');
            await window.keyboard.press(`${modString}+${key}`);
        }
        else {
            await window.keyboard.press(key);
        }
    }
    async clickByText(session, text, exact = false, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        if (exact) {
            await window.click(`text="${text}"`);
        }
        else {
            await window.click(`text=${text}`);
        }
    }
    async addLocatorHandler(session, selector, action, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.addLocatorHandler(window.locator(selector), async () => {
            if (action === 'click') {
                await window.click(selector);
            }
            else if (action === 'dismiss') {
                await window.keyboard.press('Escape');
            }
            else if (action === 'accept') {
                await window.keyboard.press('Enter');
            }
        });
    }
    async clickByRole(session, role, name, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        if (name) {
            await window.click(`role=${role}[name="${name}"]`);
        }
        else {
            await window.click(`role=${role}`);
        }
    }
    async clickNth(session, selector, index, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.click(`${selector} >> nth=${index}`);
    }
    async keyboardType(session, text, delay, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.keyboard.type(text, { delay });
    }
    async waitForLoadState(session, state, timeout, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        // Use the timeout passed from the server (which already has the correct defaults)
        const effectiveTimeout = timeout || 30000;
        try {
            await window.waitForLoadState(state || 'load', { timeout: effectiveTimeout });
        }
        catch (error) {
            if (error.message?.includes('Timeout') && state === 'networkidle') {
                console.error(`[ELECTRON-DRIVER] waitForLoadState('networkidle') timed out after ${effectiveTimeout}ms - this is common for apps with persistent network connections`);
                // Don't throw for networkidle timeouts - the page is likely ready anyway
                return;
            }
            throw error;
        }
    }
    setupPageMonitoring(page, session) {
        // Network monitoring
        page.on('request', (request) => {
            session.networkRequests.push(request);
        });
        // Console monitoring
        page.on('console', (message) => {
            session.consoleMessages.push(message);
        });
    }
    async getNetworkRequests(session) {
        const electronSession = session;
        return electronSession.networkRequests.map(req => ({
            url: req.url(),
            method: req.method(),
            timestamp: Date.now() // Approximation, would need to track actual timestamps
        }));
    }
    async getConsoleMessages(session) {
        const electronSession = session;
        return electronSession.consoleMessages.map(msg => ({
            type: msg.type(),
            text: msg.text(),
            timestamp: Date.now() // Approximation, would need to track actual timestamps
        }));
    }
}
//# sourceMappingURL=electron-driver.js.map