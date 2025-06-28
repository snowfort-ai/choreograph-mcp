import { Browser, BrowserContext, Page, chromium, firefox, webkit } from "playwright";
import { Driver, LaunchOpts, Session } from "sfcg-mcp-core";
import { randomUUID } from "crypto";

export interface WebLaunchOpts extends LaunchOpts {
  browser?: "chromium" | "firefox" | "webkit";
  headed?: boolean;
  userDataDir?: string;
  viewport?: { width: number; height: number };
}

export interface WebSession extends Session {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export class WebDriver implements Driver {
  async launch(opts: WebLaunchOpts): Promise<WebSession> {
    const browserType = opts.browser || "chromium";
    let browserInstance;

    switch (browserType) {
      case "chromium":
        browserInstance = chromium;
        break;
      case "firefox":
        browserInstance = firefox;
        break;
      case "webkit":
        browserInstance = webkit;
        break;
      default:
        throw new Error(`Unsupported browser: ${browserType}`);
    }

    const browser = await browserInstance.launch({
      headless: !opts.headed,
      timeout: opts.timeout,
    });

    const context = await browser.newContext({
      viewport: opts.viewport || { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    const session: WebSession = {
      id: randomUUID(),
      browser,
      context,
      page,
    };

    return session;
  }

  async navigate(session: Session, url: string): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.goto(url);
  }

  async click(session: Session, selector: string): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.click(selector);
  }

  async type(session: Session, selector: string, text: string): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.fill(selector, text);
  }

  async screenshot(session: Session, path?: string): Promise<string> {
    const webSession = session as WebSession;
    const screenshotPath = path || `screenshot-${Date.now()}.png`;
    await webSession.page.screenshot({ path: screenshotPath });
    return screenshotPath;
  }

  async evaluate(session: Session, script: string): Promise<any> {
    const webSession = session as WebSession;
    return await webSession.page.evaluate(script);
  }

  async waitForSelector(session: Session, selector: string, timeout?: number): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.waitForSelector(selector, { timeout: timeout || 30000 });
  }

  async snapshot(session: Session): Promise<string> {
    const webSession = session as WebSession;
    const snapshot = await webSession.page.accessibility.snapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  async hover(session: Session, selector: string): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.hover(selector);
  }

  async drag(session: Session, sourceSelector: string, targetSelector: string): Promise<void> {
    const webSession = session as WebSession;
    const sourceElement = webSession.page.locator(sourceSelector);
    const targetElement = webSession.page.locator(targetSelector);
    await sourceElement.dragTo(targetElement);
  }

  async key(session: Session, key: string): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.keyboard.press(key);
  }

  async select(session: Session, selector: string, value: string): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.selectOption(selector, value);
  }

  async upload(session: Session, selector: string, filePath: string): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.setInputFiles(selector, filePath);
  }

  async back(session: Session): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.goBack();
  }

  async forward(session: Session): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.goForward();
  }

  async refresh(session: Session): Promise<void> {
    const webSession = session as WebSession;
    await webSession.page.reload();
  }

  async pdf(session: Session, path?: string): Promise<string> {
    const webSession = session as WebSession;
    const pdfPath = path || `page-${Date.now()}.pdf`;
    await webSession.page.pdf({ path: pdfPath });
    return pdfPath;
  }

  async content(session: Session): Promise<string> {
    const webSession = session as WebSession;
    return await webSession.page.content();
  }

  async textContent(session: Session): Promise<string> {
    const webSession = session as WebSession;
    return await webSession.page.textContent('body') || '';
  }

  async getConsoleMessages(session: Session): Promise<string[]> {
    const webSession = session as WebSession;
    // Note: This would require setting up console message collection during session creation
    return [];
  }

  async close(session: Session): Promise<void> {
    const webSession = session as WebSession;
    await webSession.context.close();
    await webSession.browser.close();
  }
}