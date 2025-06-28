// Import from playwright-core (will be overridden with project version)
import { _electron as electronDefault, ElectronApplication, Page } from "playwright-core";
import { Driver, LaunchOpts, Session } from "sfcg-mcp-core";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as os from "os";
import { createRequire } from "module";

const execAsync = promisify(exec);

export interface ElectronLaunchOpts extends LaunchOpts {
  app: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  mode?: 'auto' | 'development' | 'packaged';
  projectPath?: string;
  startScript?: string;
  electronPath?: string;
  compressScreenshots?: boolean;
  screenshotQuality?: number;
}

export interface ElectronSession extends Session {
  electronApp: ElectronApplication;
  mainWindow?: Page;
  windows: Map<string, Page>;
  options?: ElectronLaunchOpts;
}

export class ElectronDriver implements Driver {
  private async getElectronInstance(projectPath?: string): Promise<{electron: any, debugInfo: string[]}> {
    const debugInfo: string[] = [];
    
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
      let projectPlaywright: any = null;
      
      // Strategy 1: ESM dynamic import (specific file)
      try {
        debugInfo.push(`[PLAYWRIGHT-DEBUG] Trying ESM dynamic import of index.js...`);
        projectPlaywright = await import(projectPlaywrightPath);
        debugInfo.push(`[PLAYWRIGHT-DEBUG] ✓ ESM dynamic import succeeded`);
      } catch (esmError) {
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
      
    } catch (error) {
      debugInfo.push(`[PLAYWRIGHT-DEBUG] ✗ Failed to load project Playwright: ${error}`);
    }
    
    debugInfo.push(`[PLAYWRIGHT-DEBUG] Falling back to NPX-cached Playwright`);
    return { electron: electronDefault, debugInfo };
  }

  async launch(opts: ElectronLaunchOpts): Promise<ElectronSession> {
    if (!opts.app) {
      throw new Error("App path is required for Electron driver");
    }

    const mode = opts.mode || 'auto';
    
    if (mode === 'auto') {
      return await this.autoLaunch(opts);
    } else if (mode === 'development') {
      return await this.launchDevelopment(opts);
    } else {
      return await this.launchPackaged(opts);
    }
  }

  private async autoLaunch(opts: ElectronLaunchOpts): Promise<ElectronSession> {
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
    } catch (error) {
      throw new Error(`Auto-launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async launchDevelopment(opts: ElectronLaunchOpts): Promise<ElectronSession> {
    const projectPath = opts.projectPath || opts.app;
    const { electron } = await this.getElectronInstance(projectPath);
    
    // Validate project path exists
    try {
      await fs.stat(projectPath);
    } catch (error) {
      throw new Error(`Project path does not exist or is not accessible: ${projectPath}. Error: ${error}`);
    }

    // Check for package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    let packageJsonContent: any;
    
    try {
      await fs.stat(packageJsonPath);
      packageJsonContent = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    } catch (error) {
      throw new Error(`No valid package.json found in ${projectPath}. Error: ${error}`);
    }

    // Check for Electron Forge project
    const isForgeProject = await this.isElectronForgeProject(projectPath, packageJsonContent);
    
    if (isForgeProject) {
      return await this.launchElectronForgeProject(opts, projectPath, packageJsonContent);
    }

    // Find Electron executable
    let electronPath: string;
    let execDebugInfo: string[] = [];
    
    if (opts.electronPath) {
      electronPath = opts.electronPath;
      execDebugInfo.push(`[EXEC-DEBUG] Using provided electronPath: ${electronPath}`);
    } else {
      const execResult = await this.findElectronExecutable(projectPath);
      electronPath = execResult.path;
      execDebugInfo = execResult.debugInfo;
    }

    // Validate Electron executable
    try {
      await fs.stat(electronPath);
    } catch (error) {
      throw new Error(`Electron executable not accessible: ${electronPath}. Error: ${error}`);
    }

    // Prepare launch configuration
    // IMPORTANT: Do NOT pass env parameter unless absolutely necessary
    // Playwright's electron.launch replaces the entire environment when env is provided
    const launchConfig: any = {
      executablePath: electronPath,
      args: ['.'],
      cwd: projectPath,
      timeout: opts.timeout || 30000,
    };
    
    // Only add env if user explicitly provided environment variables
    if (opts.env && Object.keys(opts.env).length > 0) {
      // Must include process.env to avoid breaking Electron
      launchConfig.env = { ...process.env, ...opts.env, NODE_ENV: 'development' };
    }

    // Launch Electron application
    const electronApp = await electron.launch(launchConfig);

    // Wait for main window
    const mainWindow = await electronApp.firstWindow();
    const windows = new Map<string, Page>();
    
    if (mainWindow) {
      windows.set("main", mainWindow);
    }

    // Create and return session
    const session: ElectronSession = {
      id: randomUUID(),
      electronApp,
      mainWindow,
      windows,
      options: { ...opts, compressScreenshots: opts.compressScreenshots ?? true },
    };
    
    return session;
  }

  private async launchPackaged(opts: ElectronLaunchOpts): Promise<ElectronSession> {
    const { electron } = await this.getElectronInstance();
    
    // Build launch config without env by default
    const launchConfig: any = {
      executablePath: opts.app,
      args: opts.args,
      cwd: opts.cwd,
      timeout: opts.timeout || 30000,
    };
    
    // Only add env if explicitly provided and non-empty
    if (opts.env && Object.keys(opts.env).length > 0) {
      launchConfig.env = { ...process.env, ...opts.env };
    }
    
    const electronApp = await electron.launch(launchConfig);

    const mainWindow = await electronApp.firstWindow();
    const windows = new Map<string, Page>();
    
    if (mainWindow) {
      windows.set("main", mainWindow);
    }

    const session: ElectronSession = {
      id: randomUUID(),
      electronApp,
      mainWindow,
      windows,
      options: { ...opts, compressScreenshots: opts.compressScreenshots ?? true },
    };

    return session;
  }

  private async isElectronForgeProject(projectPath: string, packageJsonContent: any): Promise<boolean> {
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
    const hasForgeScript = Object.values(scripts).some((script: any) => 
      typeof script === 'string' && script.includes('electron-forge'));
    if (hasForgeScript) {
      return true;
    }
    
    // Check for Forge config files
    const forgeFiles = ['forge.config.js', 'forge.config.ts'];
    for (const file of forgeFiles) {
      try {
        await fs.access(path.join(projectPath, file));
        return true;
      } catch {
        // File doesn't exist
      }
    }
    
    return false;
  }

  private async launchElectronForgeProject(opts: ElectronLaunchOpts, projectPath: string, packageJsonContent: any): Promise<ElectronSession> {
    let electronApp: ElectronApplication | undefined;
    let allDebugInfo: string[] = [];
    
    try {
      allDebugInfo.push(`[PLAYWRIGHT-DEBUG] Attempting to use project's Playwright...`);
      const { electron, debugInfo: playwrightDebugInfo } = await this.getElectronInstance(projectPath);
      allDebugInfo.push(...playwrightDebugInfo);
      // Find Electron executable
      let electronPath: string;
      let execDebugInfo: string[] = [];
      
      if (opts.electronPath) {
        electronPath = opts.electronPath;
        execDebugInfo.push(`[EXEC-DEBUG] Using provided electronPath: ${electronPath}`);
      } else {
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
        } else {
          allDebugInfo.push(`[CONTEXT-DEBUG] Playwright version: not exposed in module`);
        }
      } catch (e) {
        allDebugInfo.push(`[CONTEXT-DEBUG] Playwright module load failed: ${e}`);
      }
      
      // Simplified context detection
      allDebugInfo.push(`[CONTEXT-DEBUG] Module context: Running from NPX cache (different from project)`);
      allDebugInfo.push(`[CONTEXT-DEBUG] Key insight: NPX-cached Playwright vs project Playwright`);
      
      allDebugInfo.push(`[CONTEXT-DEBUG] === END CONTEXT ===`);
      
      // Prepare Forge-specific launch configuration
      // CRITICAL: Do NOT pass env parameter unless user explicitly needs it
      // Playwright's electron.launch completely replaces process.env when env is specified
      const launchConfig: any = {
        executablePath: electronPath,
        args: ['.'], // Use current directory for Forge projects
        cwd: projectPath,
        timeout: opts.timeout || 60000, // Longer timeout for Forge projects (webpack can be slow)
      };
      
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
      } catch (accessError) {
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
        } else {
          allDebugInfo.push(`[FORGE-DEBUG] ✗ Playwright _electron.launch is not a function: ${typeof electron.launch}`);
        }
      } catch (testError) {
        allDebugInfo.push(`[FORGE-DEBUG] ✗ Basic Playwright test failed: ${testError}`);
      }
      
      // Launch the Forge application
      allDebugInfo.push(`[FORGE-DEBUG] Attempting electron.launch...`);
      
      try {
        electronApp = await electron.launch(launchConfig);
        allDebugInfo.push(`[FORGE-DEBUG] ✓ electron.launch succeeded`);
      } catch (launchError) {
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
          } catch (retryError) {
            allDebugInfo.push(`[FORGE-DEBUG] ✗ Absolute path retry also failed: ${retryError}`);
            throw launchError; // Throw original error
          }
        } else {
          throw launchError;
        }
      }
      
      // Ensure electronApp was successfully created
      if (!electronApp) {
        throw new Error('Failed to create Electron application instance');
      }
      
      // Wait for main window with extended patience
      const mainWindow = await electronApp.firstWindow();
      const windows = new Map<string, Page>();
      
      if (mainWindow) {
        windows.set("main", mainWindow);
      }

      // Create session
      const session: ElectronSession = {
        id: randomUUID(),
        electronApp,
        mainWindow,
        windows,
        options: { ...opts, compressScreenshots: opts.compressScreenshots ?? true },
      };

      return session;
      
    } catch (error) {
      // Add error details to debug info
      allDebugInfo.push(`[FORGE-DEBUG] ✗ Launch failed with error: ${error instanceof Error ? error.message : String(error)}`);
      allDebugInfo.push(`[FORGE-DEBUG] Error stack: ${error instanceof Error ? error.stack : 'No stack available'}`);
      
      // Cleanup on failure
      if (electronApp) {
        try {
          await electronApp.close();
        } catch (cleanupError) {
          allDebugInfo.push(`[FORGE-DEBUG] Cleanup error: ${cleanupError}`);
        }
      }
      
      // Provide helpful error messages for common Forge issues with debug info
      const debugSummary = allDebugInfo.join('\n');
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error(`Forge project launch timeout. This often happens when:\n1. Webpack compilation is taking too long\n2. The main process is waiting for renderer\n3. Try increasing timeout or check Forge webpack config\n\nDEBUG INFO:\n${debugSummary}\n\nOriginal error: ${error.message}`);
        } else if (error.message.includes('spawn') || error.message.includes('Process failed to launch')) {
          throw new Error(`Forge project spawn error. This often happens when:\n1. Electron executable path is wrong\n2. Main file path is incorrect\n3. File permissions issue\n4. Missing dependencies or environment variables\n\nDEBUG INFO:\n${debugSummary}\n\nOriginal error: ${error.message}`);
        }
      }
      
      throw new Error(`Failed to launch Electron Forge project: ${error instanceof Error ? error.message : String(error)}\n\nDEBUG INFO:\n${debugSummary}`);
    }
  }

  private async isPackagedApp(appPath: string): Promise<boolean> {
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
        } catch {
          return false;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private async looksLikeProject(appPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(appPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private async hasPackageJson(projectPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, 'package.json'));
      return true;
    } catch {
      return false;
    }
  }

  private async findElectronExecutable(projectPath: string): Promise<{path: string, debugInfo: string[]}> {
    const debugInfo: string[] = [];
    debugInfo.push(`[EXEC-DEBUG] Finding Electron executable for project: ${projectPath}`);
    
    // Try relative path first (matches working manual test: './node_modules/.bin/electron')
    const relativeElectron = './node_modules/.bin/electron';
    debugInfo.push(`[EXEC-DEBUG] Checking relative path: ${relativeElectron}`);
    try {
      await fs.access(relativeElectron);
      debugInfo.push(`[EXEC-DEBUG] ✓ Found relative electron: ${relativeElectron}`);
      return { path: relativeElectron, debugInfo };
    } catch (e) {
      debugInfo.push(`[EXEC-DEBUG] ✗ Relative path failed: ${e}`);
    }
    
    // Check local node_modules with absolute path
    const localElectron = path.join(projectPath, 'node_modules', '.bin', 'electron');
    debugInfo.push(`[EXEC-DEBUG] Checking local bin: ${localElectron}`);
    try {
      await fs.access(localElectron);
      debugInfo.push(`[EXEC-DEBUG] ✓ Found local bin electron: ${localElectron}`);
      return { path: localElectron, debugInfo };
    } catch (e) {
      debugInfo.push(`[EXEC-DEBUG] ✗ Local bin not found: ${e}`);
    }
    
    // Check platform-specific paths
    const platform = os.platform();
    let electronBinary: string;
    
    if (platform === 'win32') {
      electronBinary = path.join(projectPath, 'node_modules', 'electron', 'dist', 'electron.exe');
    } else if (platform === 'darwin') {
      electronBinary = path.join(projectPath, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
    } else {
      electronBinary = path.join(projectPath, 'node_modules', 'electron', 'dist', 'electron');
    }
    
    debugInfo.push(`[EXEC-DEBUG] Checking platform binary: ${electronBinary}`);
    try {
      await fs.access(electronBinary);
      debugInfo.push(`[EXEC-DEBUG] ✓ Found platform binary: ${electronBinary}`);
      return { path: electronBinary, debugInfo };
    } catch (e) {
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
    } catch (e) {
      debugInfo.push(`[EXEC-DEBUG] ✗ Global electron not found: ${e}`);
    }
    
    debugInfo.push(`[EXEC-DEBUG] ✗ No Electron executable found anywhere`);
    throw new Error(`Electron executable not found. Please install electron in ${projectPath} or globally. Debug info: ${debugInfo.join('; ')}`);
  }

  async screenshot(session: Session, path?: string, windowId?: string): Promise<string> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    const compress = electronSession.options?.compressScreenshots !== false;
    const quality = electronSession.options?.screenshotQuality || 50;
    
    let screenshotPath: string;
    if (compress) {
      screenshotPath = path || `electron-screenshot-${Date.now()}.jpeg`;
      await window.screenshot({ 
        path: screenshotPath,
        type: 'jpeg',
        quality: quality
      });
    } else {
      screenshotPath = path || `electron-screenshot-${Date.now()}.png`;
      await window.screenshot({ 
        path: screenshotPath,
        type: 'png'
      });
    }
    
    return screenshotPath;
  }

  async snapshot(session: Session, windowId?: string): Promise<string> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    const snapshot = await window.accessibility.snapshot();
    const enhancedSnapshot = this.enhanceSnapshotWithRefs(snapshot);
    return JSON.stringify(enhancedSnapshot, null, 2);
  }

  private enhanceSnapshotWithRefs(snapshot: any): any {
    if (!snapshot) return snapshot;
    
    let refCounter = 1;
    const addRefs = (node: any): any => {
      if (!node || typeof node !== 'object') return node;
      
      const enhanced = { ...node };
      
      if (node.role && node.role !== 'WebArea' && node.role !== 'RootWebArea') {
        enhanced.ref = `e${refCounter++}`;
      }
      
      if (node.children && Array.isArray(node.children)) {
        enhanced.children = node.children.map(addRefs);
      }
      
      return enhanced;
    };
    
    return addRefs(snapshot);
  }

  async click(session: Session, selector: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.click(selector);
  }

  async type(session: Session, selector: string, text: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.fill(selector, text);
  }

  async evaluate(session: Session, script: string, windowId?: string): Promise<any> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    return await window.evaluate(script);
  }

  async waitForSelector(session: Session, selector: string, timeout?: number, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.waitForSelector(selector, { timeout });
  }

  async close(session: Session): Promise<void> {
    const electronSession = session as ElectronSession;
    await electronSession.electronApp.close();
  }

  private getWindow(session: ElectronSession, windowId?: string): Page {
    if (windowId && session.windows.has(windowId)) {
      return session.windows.get(windowId)!;
    }
    
    if (session.mainWindow) {
      return session.mainWindow;
    }
    
    throw new Error(`No window found for ID: ${windowId || 'main'}`);
  }

  // Additional methods for all the other MCP tools...
  async hover(session: Session, selector: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.hover(selector);
  }

  async drag(session: Session, sourceSelector: string, targetSelector: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.dragAndDrop(sourceSelector, targetSelector);
  }

  async key(session: Session, key: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.keyboard.press(key);
  }

  async select(session: Session, selector: string, value: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.selectOption(selector, value);
  }

  async upload(session: Session, selector: string, filePath: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.setInputFiles(selector, filePath);
  }

  async back(session: Session, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.goBack();
  }

  async forward(session: Session, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.goForward();
  }

  async refresh(session: Session, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.reload();
  }

  async content(session: Session, windowId?: string): Promise<string> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    return await window.content();
  }

  async textContent(session: Session, windowId?: string): Promise<string> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    return await window.textContent('body') || '';
  }

  // Electron-specific methods
  async invokeIPC(session: Session, channel: string, ...args: any[]): Promise<any> {
    const electronSession = session as ElectronSession;
    return await electronSession.electronApp.evaluate(
      ({ ipcMain }, { channel, args }) => {
        return new Promise((resolve) => {
          ipcMain.handle('__mcp_test', () => {
            const { ipcRenderer } = require('electron');
            return ipcRenderer.invoke(channel, ...args);
          });
          resolve(require('electron').ipcMain.emit('__mcp_test'));
        });
      },
      { channel, args }
    );
  }

  async getWindows(session: Session): Promise<string[]> {
    const electronSession = session as ElectronSession;
    const windows = await electronSession.electronApp.windows();
    return windows.map((_, index) => `window-${index}`);
  }

  async writeFile(session: Session, filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf8');
  }

  async readFile(session: Session, filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf8');
  }

  async keyboardPress(session: Session, key: string, modifiers?: string[], windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    if (modifiers && modifiers.length > 0) {
      const modString = modifiers.join('+');
      await window.keyboard.press(`${modString}+${key}`);
    } else {
      await window.keyboard.press(key);
    }
  }

  async clickByText(session: Session, text: string, exact: boolean = false, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    if (exact) {
      await window.click(`text="${text}"`);
    } else {
      await window.click(`text=${text}`);
    }
  }

  async addLocatorHandler(session: Session, selector: string, action: "dismiss" | "accept" | "click", windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    await window.addLocatorHandler(window.locator(selector), async () => {
      if (action === 'click') {
        await window.click(selector);
      } else if (action === 'dismiss') {
        await window.keyboard.press('Escape');
      } else if (action === 'accept') {
        await window.keyboard.press('Enter');
      }
    });
  }

  async clickByRole(session: Session, role: string, name?: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    if (name) {
      await window.click(`role=${role}[name="${name}"]`);
    } else {
      await window.click(`role=${role}`);
    }
  }

  async clickNth(session: Session, selector: string, index: number, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.click(`${selector} >> nth=${index}`);
  }

  async keyboardType(session: Session, text: string, delay?: number, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.keyboard.type(text, { delay });
  }

  async waitForLoadState(session: Session, state?: "load" | "domcontentloaded" | "networkidle", windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.waitForLoadState(state || 'load');
  }
}