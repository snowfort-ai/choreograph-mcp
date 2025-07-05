"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebDriver = void 0;
const playwright_core_1 = require("playwright-core");
const crypto_1 = require("crypto");
class WebDriver {
    async launch(opts) {
        const browserType = opts.browser || "chromium";
        let browserInstance;
        switch (browserType) {
            case "chromium":
                browserInstance = playwright_core_1.chromium;
                break;
            case "firefox":
                browserInstance = playwright_core_1.firefox;
                break;
            case "webkit":
                browserInstance = playwright_core_1.webkit;
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
        const pageId = (0, crypto_1.randomUUID)();
        const session = {
            id: (0, crypto_1.randomUUID)(),
            browser,
            context,
            pages: new Map(),
            activePage: pageId,
            networkRequests: [],
            consoleMessages: [],
            recordedActions: [],
            options: opts,
        };
        // Add the initial page
        session.pages.set(pageId, {
            id: pageId,
            page,
            title: 'New Tab',
            url: 'about:blank',
            elementRefs: new Map(),
        });
        // Set up event listeners for the initial page
        this.setupPageListeners(session, pageId);
        return session;
    }
    async navigate(session, url) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.goto(url);
        pageInfo.url = url;
        pageInfo.title = await pageInfo.page.title();
        this.recordAction(webSession, 'navigate', undefined, url);
    }
    async click(session, selector) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.click(selector);
        this.recordAction(webSession, 'click', selector);
    }
    async type(session, selector, text) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.fill(selector, text);
        this.recordAction(webSession, 'type', selector, text);
    }
    async screenshot(session, path) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        const compress = webSession.options.compressScreenshots !== false; // Default true
        const quality = webSession.options.screenshotQuality || 50;
        let screenshotPath;
        if (compress) {
            screenshotPath = path || `screenshot-${Date.now()}.jpeg`;
            await pageInfo.page.screenshot({
                path: screenshotPath,
                type: 'jpeg',
                quality: quality
            });
        }
        else {
            screenshotPath = path || `screenshot-${Date.now()}.png`;
            await pageInfo.page.screenshot({
                path: screenshotPath,
                type: 'png'
            });
        }
        return screenshotPath;
    }
    async evaluate(session, script) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
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
            return await pageInfo.page.evaluate(evalScript);
        }
        catch (error) {
            // Handle syntax errors and other evaluation errors gracefully
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Log detailed error for debugging
            console.error(`[WEB-MCP] JavaScript evaluation error:`, errorMessage);
            console.error(`[WEB-MCP] Script that failed:`, script);
            // Re-throw with more context
            throw new Error(`JavaScript evaluation failed: ${errorMessage}`);
        }
    }
    async waitForSelector(session, selector, timeout) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.waitForSelector(selector, { timeout: timeout || 30000 });
    }
    async snapshot(session) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        const snapshot = await pageInfo.page.accessibility.snapshot();
        const enhancedSnapshot = this.enhanceSnapshotWithRefs(snapshot, pageInfo);
        return JSON.stringify(enhancedSnapshot, null, 2);
    }
    enhanceSnapshotWithRefs(snapshot, pageInfo) {
        if (!snapshot)
            return snapshot;
        let refCounter = 1;
        const addRefs = (node) => {
            if (!node)
                return node;
            const enhanced = { ...node };
            // Add element reference
            if (node.role && node.role !== 'WebArea') {
                const ref = `e${refCounter++}`;
                enhanced.ref = ref;
                // Store reference for later use
                if (pageInfo.elementRefs) {
                    pageInfo.elementRefs.set(ref, {
                        ref,
                        role: node.role,
                        name: node.name,
                        level: node.level,
                        selector: this.generateSelector(node)
                    });
                }
            }
            // Process children recursively
            if (node.children && Array.isArray(node.children)) {
                enhanced.children = node.children.map(addRefs);
            }
            return enhanced;
        };
        return addRefs(snapshot);
    }
    generateSelector(node) {
        // Generate basic CSS selector based on node properties
        if (node.role === 'link' && node.name) {
            return `a[href]:has-text("${node.name}")`;
        }
        if (node.role === 'button' && node.name) {
            return `button:has-text("${node.name}")`;
        }
        if (node.role === 'heading' && node.name) {
            return `h${node.level || '1'}:has-text("${node.name}")`;
        }
        if (node.role === 'textbox' && node.name) {
            return `input[placeholder*="${node.name}"]`;
        }
        // Fallback to role-based selector
        return `[role="${node.role}"]`;
    }
    async hover(session, selector) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.hover(selector);
        this.recordAction(webSession, 'hover', selector);
    }
    async drag(session, sourceSelector, targetSelector) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        const sourceElement = pageInfo.page.locator(sourceSelector);
        const targetElement = pageInfo.page.locator(targetSelector);
        await sourceElement.dragTo(targetElement);
        this.recordAction(webSession, 'drag', `${sourceSelector} to ${targetSelector}`);
    }
    async key(session, key) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.keyboard.press(key);
        this.recordAction(webSession, 'key', undefined, key);
    }
    async select(session, selector, value) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.selectOption(selector, value);
        this.recordAction(webSession, 'select', selector, value);
    }
    async upload(session, selector, filePath) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.setInputFiles(selector, filePath);
        this.recordAction(webSession, 'upload', selector, filePath);
    }
    async back(session) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.goBack();
        this.recordAction(webSession, 'back');
    }
    async forward(session) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.goForward();
        this.recordAction(webSession, 'forward');
    }
    async refresh(session) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.reload();
        this.recordAction(webSession, 'refresh');
    }
    async pdf(session, path) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        const pdfPath = path || `page-${Date.now()}.pdf`;
        await pageInfo.page.pdf({ path: pdfPath });
        return pdfPath;
    }
    async content(session) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        return await pageInfo.page.content();
    }
    async textContent(session) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        return await pageInfo.page.textContent('body') || '';
    }
    async resize(session, width, height) {
        const webSession = session;
        const pageInfo = webSession.pages.get(webSession.activePage);
        if (!pageInfo) {
            throw new Error('No active page found');
        }
        await pageInfo.page.setViewportSize({ width, height });
        this.recordAction(webSession, 'resize', undefined, `${width}x${height}`);
    }
    async handleDialog(session, action, promptText) {
        const webSession = session;
        webSession.dialogHandler = { action, promptText };
    }
    async newTab(session) {
        const webSession = session;
        const page = await webSession.context.newPage();
        const pageId = (0, crypto_1.randomUUID)();
        webSession.pages.set(pageId, {
            id: pageId,
            page,
            title: 'New Tab',
            url: 'about:blank',
            elementRefs: new Map(),
        });
        this.setupPageListeners(webSession, pageId);
        return pageId;
    }
    async listTabs(session) {
        const webSession = session;
        const tabs = [];
        for (const [pageId, pageInfo] of webSession.pages) {
            tabs.push({
                id: pageId,
                title: pageInfo.title || 'Untitled',
                url: pageInfo.url || 'about:blank',
                active: pageId === webSession.activePage
            });
        }
        return tabs;
    }
    async selectTab(session, pageId) {
        const webSession = session;
        if (!webSession.pages.has(pageId)) {
            throw new Error(`Tab not found: ${pageId}`);
        }
        webSession.activePage = pageId;
    }
    async closeTab(session, pageId) {
        const webSession = session;
        const pageInfo = webSession.pages.get(pageId);
        if (!pageInfo) {
            throw new Error(`Tab not found: ${pageId}`);
        }
        await pageInfo.page.close();
        webSession.pages.delete(pageId);
        // If we closed the active page, switch to another one
        if (webSession.activePage === pageId) {
            const remainingPages = Array.from(webSession.pages.keys());
            if (remainingPages.length > 0) {
                webSession.activePage = remainingPages[0];
            }
            else {
                throw new Error('Cannot close the last tab');
            }
        }
    }
    async getNetworkRequests(session) {
        const webSession = session;
        return webSession.networkRequests.map(req => ({
            url: req.url(),
            method: req.method(),
            timestamp: Date.now() // Approximation, would need to track actual timestamps
        }));
    }
    async getConsoleMessages(session) {
        const webSession = session;
        return webSession.consoleMessages.map(msg => ({
            type: msg.type(),
            text: msg.text(),
            timestamp: Date.now() // Approximation, would need to track actual timestamps
        }));
    }
    async generatePlaywrightTest(session) {
        const webSession = session;
        let testCode = `const { test, expect } = require('@playwright/test');

test('Generated test', async ({ page }) => {
`;
        for (const action of webSession.recordedActions) {
            switch (action.type) {
                case 'navigate':
                    testCode += `  await page.goto('${action.text}');
`;
                    break;
                case 'click':
                    testCode += `  await page.click('${action.selector}');
`;
                    break;
                case 'type':
                    testCode += `  await page.fill('${action.selector}', '${action.text}');
`;
                    break;
                case 'key':
                    testCode += `  await page.keyboard.press('${action.text}');
`;
                    break;
                case 'hover':
                    testCode += `  await page.hover('${action.selector}');
`;
                    break;
                case 'select':
                    testCode += `  await page.selectOption('${action.selector}', '${action.text}');
`;
                    break;
            }
        }
        testCode += `});
`;
        return testCode;
    }
    setupPageListeners(session, pageId) {
        const pageInfo = session.pages.get(pageId);
        if (!pageInfo)
            return;
        const page = pageInfo.page;
        // Dialog handling
        page.on('dialog', async (dialog) => {
            if (session.dialogHandler) {
                const { action, promptText } = session.dialogHandler;
                if (action === 'accept') {
                    await dialog.accept(promptText || '');
                }
                else {
                    await dialog.dismiss();
                }
            }
            else {
                await dialog.dismiss(); // Default action
            }
        });
        // Network monitoring
        page.on('request', (request) => {
            session.networkRequests.push(request);
        });
        // Console monitoring
        page.on('console', (message) => {
            session.consoleMessages.push(message);
        });
        // Update page info on navigation
        page.on('load', async () => {
            pageInfo.title = await page.title();
            pageInfo.url = page.url();
            // Clear element refs on navigation
            if (pageInfo.elementRefs) {
                pageInfo.elementRefs.clear();
            }
        });
    }
    recordAction(session, type, selector, text) {
        session.recordedActions.push({
            type,
            selector,
            text,
            timestamp: Date.now()
        });
    }
    async close(session) {
        const webSession = session;
        // Close all pages
        for (const pageInfo of webSession.pages.values()) {
            await pageInfo.page.close();
        }
        await webSession.context.close();
        await webSession.browser.close();
    }
}
exports.WebDriver = WebDriver;
//# sourceMappingURL=web-driver.js.map