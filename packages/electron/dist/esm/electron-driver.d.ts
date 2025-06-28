import { ElectronApplication, Page } from "playwright-core";
import { Driver, LaunchOpts, Session } from "sfcg-mcp-core";
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
export declare class ElectronDriver implements Driver {
    private getElectronInstance;
    launch(opts: ElectronLaunchOpts): Promise<ElectronSession>;
    private autoLaunch;
    private launchDevelopment;
    private launchPackaged;
    private isElectronForgeProject;
    private launchElectronForgeProject;
    private isPackagedApp;
    private looksLikeProject;
    private hasPackageJson;
    private findElectronExecutable;
    screenshot(session: Session, path?: string, windowId?: string): Promise<string>;
    snapshot(session: Session, windowId?: string): Promise<string>;
    private enhanceSnapshotWithRefs;
    click(session: Session, selector: string, windowId?: string): Promise<void>;
    type(session: Session, selector: string, text: string, windowId?: string): Promise<void>;
    evaluate(session: Session, script: string, windowId?: string): Promise<any>;
    waitForSelector(session: Session, selector: string, timeout?: number, windowId?: string): Promise<void>;
    close(session: Session): Promise<void>;
    private getWindow;
    hover(session: Session, selector: string, windowId?: string): Promise<void>;
    drag(session: Session, sourceSelector: string, targetSelector: string, windowId?: string): Promise<void>;
    key(session: Session, key: string, windowId?: string): Promise<void>;
    select(session: Session, selector: string, value: string, windowId?: string): Promise<void>;
    upload(session: Session, selector: string, filePath: string, windowId?: string): Promise<void>;
    back(session: Session, windowId?: string): Promise<void>;
    forward(session: Session, windowId?: string): Promise<void>;
    refresh(session: Session, windowId?: string): Promise<void>;
    content(session: Session, windowId?: string): Promise<string>;
    textContent(session: Session, windowId?: string): Promise<string>;
    invokeIPC(session: Session, channel: string, ...args: any[]): Promise<any>;
    getWindows(session: Session): Promise<string[]>;
    writeFile(session: Session, filePath: string, content: string): Promise<void>;
    readFile(session: Session, filePath: string): Promise<string>;
    keyboardPress(session: Session, key: string, modifiers?: string[], windowId?: string): Promise<void>;
    clickByText(session: Session, text: string, exact?: boolean, windowId?: string): Promise<void>;
    addLocatorHandler(session: Session, selector: string, action: "dismiss" | "accept" | "click", windowId?: string): Promise<void>;
    clickByRole(session: Session, role: string, name?: string, windowId?: string): Promise<void>;
    clickNth(session: Session, selector: string, index: number, windowId?: string): Promise<void>;
    keyboardType(session: Session, text: string, delay?: number, windowId?: string): Promise<void>;
    waitForLoadState(session: Session, state?: "load" | "domcontentloaded" | "networkidle", windowId?: string): Promise<void>;
}
//# sourceMappingURL=electron-driver.d.ts.map