const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture network activity
    const failedRequests = [];
    page.on('response', response => {
        if (!response.ok()) {
            failedRequests.push({
                url: response.url(),
                status: response.status(),
                statusText: response.statusText()
            });
        }
    });

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    // Navigate to the page
    console.log('Loading http://localhost:8000...');
    await page.goto('http://localhost:8000');

    // Wait a bit for signals to load (or fail)
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'page-state.png', fullPage: true });
    console.log('Screenshot saved to page-state.png');

    // Report findings
    console.log('\n=== FAILED NETWORK REQUESTS ===');
    if (failedRequests.length === 0) {
        console.log('None');
    } else {
        failedRequests.forEach(req => {
            console.log(`${req.status} ${req.statusText}: ${req.url}`);
        });
    }

    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length === 0) {
        console.log('None');
    } else {
        consoleErrors.forEach(err => console.log(err));
    }

    // Check what's actually visible
    const errorMessage = await page.locator('.error-state').textContent().catch(() => null);
    if (errorMessage) {
        console.log('\n=== ERROR STATE VISIBLE ===');
        console.log(errorMessage);
    }

    await browser.close();
})();
