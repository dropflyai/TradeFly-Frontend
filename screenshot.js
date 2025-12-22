const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto('http://localhost:8000');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'current-state.png', fullPage: true });
    console.log('Screenshot saved to current-state.png');

    // Check if signals container has content
    const signalsHTML = await page.locator('#signals-container').innerHTML();
    console.log('\n=== SIGNALS CONTAINER CONTENT ===');
    console.log(signalsHTML.substring(0, 500));

    await browser.close();
})();
