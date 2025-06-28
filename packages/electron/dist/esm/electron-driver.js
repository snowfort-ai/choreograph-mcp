import { _electron as electron } from "playwright";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
export class ElectronDriver {
    async launch(opts) {
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
        const windows = new Map();
        if (mainWindow) {
            windows.set("main", mainWindow);
        }
        const session = {
            id: randomUUID(),
            electronApp,
            mainWindow,
            windows,
        };
        return session;
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
    async screenshot(session, path, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const screenshotPath = path || `electron-screenshot-${Date.now()}.png`;
        await window.screenshot({ path: screenshotPath });
        return screenshotPath;
    }
    async evaluate(session, script, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        return await window.evaluate(script);
    }
    async waitForSelector(session, selector, timeout, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.waitForSelector(selector, { timeout: timeout || 30000 });
    }
    async invokeIPC(session, channel, ...args) {
        const electronSession = session;
        if (!electronSession.mainWindow) {
            throw new Error("No main window available for IPC communication");
        }
        return await electronSession.electronApp.evaluate(({ ipcMain }, { channel, args }) => {
            return new Promise((resolve, reject) => {
                ipcMain.handle(`${channel}-response`, (event, result) => {
                    resolve(result);
                });
                ipcMain.emit(channel, null, ...args);
                setTimeout(() => {
                    reject(new Error(`IPC call to ${channel} timed out`));
                }, 5000);
            });
        }, { channel, args });
    }
    async getWindows(session) {
        const electronSession = session;
        const windows = await electronSession.electronApp.windows();
        const windowIds = [];
        for (let i = 0; i < windows.length; i++) {
            const windowId = `window-${i}`;
            electronSession.windows.set(windowId, windows[i]);
            windowIds.push(windowId);
        }
        return windowIds;
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
            const modifierKey = modifiers.join("+") + "+" + key;
            await window.keyboard.press(modifierKey);
        }
        else {
            await window.keyboard.press(key);
        }
    }
    async clickByText(session, text, exact = false, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const locator = exact ? window.getByText(text, { exact: true }) : window.getByText(text);
        await locator.click();
    }
    async addLocatorHandler(session, selector, action, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const locator = window.locator(selector);
        switch (action) {
            case "dismiss":
                await window.addLocatorHandler(locator, async () => {
                    try {
                        await locator.click({ timeout: 1000 });
                    }
                    catch (error) {
                        // Ignore if element can't be clicked
                    }
                });
                break;
            case "accept":
                await window.addLocatorHandler(locator, async () => {
                    try {
                        await locator.click({ timeout: 1000 });
                    }
                    catch (error) {
                        // Ignore if element can't be clicked
                    }
                });
                break;
            case "click":
                await window.addLocatorHandler(locator, async () => {
                    try {
                        await locator.click({ timeout: 1000 });
                    }
                    catch (error) {
                        // Ignore if element can't be clicked
                    }
                });
                break;
            default:
                throw new Error(`Unsupported action: ${action}`);
        }
    }
    async clickByRole(session, role, name, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const locator = name
            ? window.getByRole(role, { name })
            : window.getByRole(role);
        await locator.click();
    }
    async clickNth(session, selector, index, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const locator = window.locator(selector).nth(index);
        await locator.click();
    }
    async keyboardType(session, text, delay, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.keyboard.type(text, { delay: delay || 0 });
    }
    async waitForLoadState(session, state, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.waitForLoadState(state || "load");
    }
    async snapshot(session, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const snapshot = await window.accessibility.snapshot();
        return JSON.stringify(snapshot, null, 2);
    }
    async hover(session, selector, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        await window.hover(selector);
    }
    async drag(session, sourceSelector, targetSelector, windowId) {
        const electronSession = session;
        const window = this.getWindow(electronSession, windowId);
        const sourceElement = window.locator(sourceSelector);
        const targetElement = window.locator(targetSelector);
        await sourceElement.dragTo(targetElement);
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
    async close(session) {
        const electronSession = session;
        await electronSession.electronApp.close();
    }
    getWindow(session, windowId) {
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
//# sourceMappingURL=electron-driver.js.map