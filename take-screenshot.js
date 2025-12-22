const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto('http://localhost:8000');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'dashboard-current.png', fullPage: true });
    console.log('Screenshot saved to dashboard-current.png');

    await browser.close();
})();
