import { _electron as electron, ElectronApplication, Page } from "playwright";
import { Driver, LaunchOpts, Session } from "sfcg-mcp-core";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";

export interface ElectronLaunchOpts extends LaunchOpts {
  app: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface ElectronSession extends Session {
  electronApp: ElectronApplication;
  mainWindow?: Page;
  windows: Map<string, Page>;
}

export class ElectronDriver implements Driver {
  async launch(opts: ElectronLaunchOpts): Promise<ElectronSession> {
    if (!opts.app) {
      throw new Error("App path is required for Electron driver");
    }

    const electronApp = await electron.launch({
      executablePath: opts.app,
      args: opts.args,
      env: opts.env,
      cwd: opts.cwd,
      timeout: opts.timeout,
    });

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
    };

    return session;
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

  async screenshot(session: Session, path?: string, windowId?: string): Promise<string> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    const screenshotPath = path || `electron-screenshot-${Date.now()}.png`;
    await window.screenshot({ path: screenshotPath });
    return screenshotPath;
  }

  async evaluate(session: Session, script: string, windowId?: string): Promise<any> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    return await window.evaluate(script);
  }

  async waitForSelector(session: Session, selector: string, timeout?: number, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.waitForSelector(selector, { timeout: timeout || 30000 });
  }

  async invokeIPC(session: Session, channel: string, ...args: any[]): Promise<any> {
    const electronSession = session as ElectronSession;
    if (!electronSession.mainWindow) {
      throw new Error("No main window available for IPC communication");
    }
    
    return await electronSession.electronApp.evaluate(
      ({ ipcMain }, { channel, args }) => {
        return new Promise((resolve, reject) => {
          ipcMain.handle(`${channel}-response`, (event: any, result: any) => {
            resolve(result);
          });
          
          ipcMain.emit(channel, null, ...args);
          
          setTimeout(() => {
            reject(new Error(`IPC call to ${channel} timed out`));
          }, 5000);
        });
      },
      { channel, args }
    );
  }

  async getWindows(session: Session): Promise<string[]> {
    const electronSession = session as ElectronSession;
    const windows = await electronSession.electronApp.windows();
    
    const windowIds: string[] = [];
    for (let i = 0; i < windows.length; i++) {
      const windowId = `window-${i}`;
      electronSession.windows.set(windowId, windows[i]);
      windowIds.push(windowId);
    }
    
    return windowIds;
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
      const modifierKey = modifiers.join("+") + "+" + key;
      await window.keyboard.press(modifierKey);
    } else {
      await window.keyboard.press(key);
    }
  }

  async clickByText(session: Session, text: string, exact: boolean = false, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    const locator = exact ? window.getByText(text, { exact: true }) : window.getByText(text);
    await locator.click();
  }

  async addLocatorHandler(session: Session, selector: string, action: "dismiss" | "accept" | "click", windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    const locator = window.locator(selector);
    
    switch (action) {
      case "dismiss":
        await window.addLocatorHandler(locator, async () => {
          try {
            await locator.click({ timeout: 1000 });
          } catch (error) {
            // Ignore if element can't be clicked
          }
        });
        break;
      case "accept":
        await window.addLocatorHandler(locator, async () => {
          try {
            await locator.click({ timeout: 1000 });
          } catch (error) {
            // Ignore if element can't be clicked
          }
        });
        break;
      case "click":
        await window.addLocatorHandler(locator, async () => {
          try {
            await locator.click({ timeout: 1000 });
          } catch (error) {
            // Ignore if element can't be clicked
          }
        });
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  async clickByRole(session: Session, role: string, name?: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    const locator = name 
      ? window.getByRole(role as any, { name })
      : window.getByRole(role as any);
    await locator.click();
  }

  async clickNth(session: Session, selector: string, index: number, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    const locator = window.locator(selector).nth(index);
    await locator.click();
  }

  async keyboardType(session: Session, text: string, delay?: number, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    await window.keyboard.type(text, { delay: delay || 0 });
  }

  async waitForLoadState(session: Session, state?: "load" | "domcontentloaded" | "networkidle", windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    await window.waitForLoadState(state || "load");
  }

  async snapshot(session: Session, windowId?: string): Promise<string> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    
    const snapshot = await window.accessibility.snapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  async hover(session: Session, selector: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    await window.hover(selector);
  }

  async drag(session: Session, sourceSelector: string, targetSelector: string, windowId?: string): Promise<void> {
    const electronSession = session as ElectronSession;
    const window = this.getWindow(electronSession, windowId);
    const sourceElement = window.locator(sourceSelector);
    const targetElement = window.locator(targetSelector);
    await sourceElement.dragTo(targetElement);
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

  async close(session: Session): Promise<void> {
    const electronSession = session as ElectronSession;
    await electronSession.electronApp.close();
  }

  private getWindow(session: ElectronSession, windowId?: string): Page {
    if (!windowId || windowId === "main") {
      if (!session.mainWindow) {
        throw new Error("No main window available");
      }
      return session.mainWindow;
    }
    
    const window = session.windows.get(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }
    
    return window;
  }
}