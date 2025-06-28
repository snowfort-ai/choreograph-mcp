import { chromium, firefox, webkit } from "playwright-core";
import { randomUUID } from "crypto";
export class WebDriver {
    async launch(opts) {
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
        const session = {
            id: randomUUID(),
            browser,
            context,
            page,
        };
        return session;
    }
    async navigate(session, url) {
        const webSession = session;
        await webSession.page.goto(url);
    }
    async click(session, selector) {
        const webSession = session;
        await webSession.page.click(selector);
    }
    async type(session, selector, text) {
        const webSession = session;
        await webSession.page.fill(selector, text);
    }
    async screenshot(session, path) {
        const webSession = session;
        const screenshotPath = path || `screenshot-${Date.now()}.png`;
        await webSession.page.screenshot({ path: screenshotPath });
        return screenshotPath;
    }
    async evaluate(session, script) {
        const webSession = session;
        return await webSession.page.evaluate(script);
    }
    async waitForSelector(session, selector, timeout) {
        const webSession = session;
        await webSession.page.waitForSelector(selector, { timeout: timeout || 30000 });
    }
    async snapshot(session) {
        const webSession = session;
        const snapshot = await webSession.page.accessibility.snapshot();
        return JSON.stringify(snapshot, null, 2);
    }
    async hover(session, selector) {
        const webSession = session;
        await webSession.page.hover(selector);
    }
    async drag(session, sourceSelector, targetSelector) {
        const webSession = session;
        const sourceElement = webSession.page.locator(sourceSelector);
        const targetElement = webSession.page.locator(targetSelector);
        await sourceElement.dragTo(targetElement);
    }
    async key(session, key) {
        const webSession = session;
        await webSession.page.keyboard.press(key);
    }
    async select(session, selector, value) {
        const webSession = session;
        await webSession.page.selectOption(selector, value);
    }
    async upload(session, selector, filePath) {
        const webSession = session;
        await webSession.page.setInputFiles(selector, filePath);
    }
    async back(session) {
        const webSession = session;
        await webSession.page.goBack();
    }
    async forward(session) {
        const webSession = session;
        await webSession.page.goForward();
    }
    async refresh(session) {
        const webSession = session;
        await webSession.page.reload();
    }
    async pdf(session, path) {
        const webSession = session;
        const pdfPath = path || `page-${Date.now()}.pdf`;
        await webSession.page.pdf({ path: pdfPath });
        return pdfPath;
    }
    async content(session) {
        const webSession = session;
        return await webSession.page.content();
    }
    async textContent(session) {
        const webSession = session;
        return await webSession.page.textContent('body') || '';
    }
    async getConsoleMessages(session) {
        const webSession = session;
        // Note: This would require setting up console message collection during session creation
        return [];
    }
    async close(session) {
        const webSession = session;
        await webSession.context.close();
        await webSession.browser.close();
    }
}
//# sourceMappingURL=web-driver.js.map