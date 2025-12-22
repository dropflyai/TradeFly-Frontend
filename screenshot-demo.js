const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Open the demo HTML file directly
    const demoPath = path.join(__dirname, 'demo-dashboard.html');
    await page.goto(`file://${demoPath}`);
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'demo-screenshot.png', fullPage: true });
    console.log('Demo screenshot saved to demo-screenshot.png');

    await browser.close();
})();
