import { Browser, BrowserContext, Page, ConsoleMessage, Request } from "playwright-core";
import { Driver, LaunchOpts, Session } from "@snowfort/circuit-core";
export interface WebLaunchOpts extends LaunchOpts {
    browser?: "chromium" | "firefox" | "webkit";
    headed?: boolean;
    userDataDir?: string;
    viewport?: {
        width: number;
        height: number;
    };
    compressScreenshots?: boolean;
    screenshotQuality?: number;
}
export interface ElementRef {
    ref: string;
    role: string;
    name?: string;
    selector?: string;
    level?: number;
}
export interface PageInfo {
    id: string;
    page: Page;
    title?: string;
    url?: string;
    elementRefs?: Map<string, ElementRef>;
}
export interface WebSession extends Session {
    browser: Browser;
    context: BrowserContext;
    pages: Map<string, PageInfo>;
    activePage: string;
    networkRequests: Request[];
    consoleMessages: ConsoleMessage[];
    dialogHandler?: {
        action: 'accept' | 'dismiss';
        promptText?: string;
    };
    recordedActions: Array<{
        type: string;
        selector?: string;
        text?: string;
        timestamp: number;
    }>;
    options: WebLaunchOpts;
}
export declare class WebDriver implements Driver {
    launch(opts: WebLaunchOpts): Promise<WebSession>;
    navigate(session: Session, url: string): Promise<void>;
    click(session: Session, selector: string): Promise<void>;
    type(session: Session, selector: string, text: string): Promise<void>;
    screenshot(session: Session, path?: string): Promise<string>;
    evaluate(session: Session, script: string): Promise<any>;
    waitForSelector(session: Session, selector: string, timeout?: number): Promise<void>;
    snapshot(session: Session): Promise<string>;
    private enhanceSnapshotWithRefs;
    private generateSelector;
    hover(session: Session, selector: string): Promise<void>;
    drag(session: Session, sourceSelector: string, targetSelector: string): Promise<void>;
    key(session: Session, key: string): Promise<void>;
    select(session: Session, selector: string, value: string): Promise<void>;
    upload(session: Session, selector: string, filePath: string): Promise<void>;
    back(session: Session): Promise<void>;
    forward(session: Session): Promise<void>;
    refresh(session: Session): Promise<void>;
    pdf(session: Session, path?: string): Promise<string>;
    content(session: Session): Promise<string>;
    textContent(session: Session): Promise<string>;
    resize(session: Session, width: number, height: number): Promise<void>;
    handleDialog(session: Session, action: 'accept' | 'dismiss', promptText?: string): Promise<void>;
    newTab(session: Session): Promise<string>;
    listTabs(session: Session): Promise<Array<{
        id: string;
        title: string;
        url: string;
        active: boolean;
    }>>;
    selectTab(session: Session, pageId: string): Promise<void>;
    closeTab(session: Session, pageId: string): Promise<void>;
    getNetworkRequests(session: Session): Promise<Array<{
        url: string;
        method: string;
        status?: number;
        timestamp: number;
    }>>;
    getConsoleMessages(session: Session): Promise<Array<{
        type: string;
        text: string;
        timestamp: number;
    }>>;
    generatePlaywrightTest(session: Session): Promise<string>;
    private setupPageListeners;
    private recordAction;
    close(session: Session): Promise<void>;
}
//# sourceMappingURL=web-driver.d.ts.map