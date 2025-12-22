const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto('http://localhost:8000/demo-dashboard.html');

    // Wait for data to load
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'live-dashboard.png', fullPage: true });
    console.log('Live dashboard screenshot saved to live-dashboard.png');

    await browser.close();
})();
