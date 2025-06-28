import { Browser, BrowserContext, Page } from "playwright";
import { Driver, LaunchOpts, Session } from "@sfcg/core";
export interface WebLaunchOpts extends LaunchOpts {
    browser?: "chromium" | "firefox" | "webkit";
    headed?: boolean;
    userDataDir?: string;
    viewport?: {
        width: number;
        height: number;
    };
}
export interface WebSession extends Session {
    browser: Browser;
    context: BrowserContext;
    page: Page;
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
    getConsoleMessages(session: Session): Promise<string[]>;
    close(session: Session): Promise<void>;
}
//# sourceMappingURL=web-driver.d.ts.map