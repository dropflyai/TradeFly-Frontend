/**
 * Playwright Test Suite: Trading Signals Page
 *
 * Product Target: WEB_SAAS
 * Artifact Type: Fragment (router-injected)
 * Engineering Mode: APP
 *
 * SETUP:
 * 1. Start dev server: python3 -m http.server 8000
 * 2. Run tests: npx playwright test tests/signals.spec.ts --project=chromium
 * 3. With UI: npx playwright test tests/signals.spec.ts --ui
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:8000';
const SIGNALS_ROUTE = '/signals';

// Mock data based on evidence from signals.html lines 516-574
const MOCK_SIGNAL = {
    action: 'BUY CALL',
    entry_price: 2.50,
    target_price: 3.00,
    stop_loss: 2.00,
    confidence: 0.85,
    contract: {
        symbol: 'AAPL',
        strike: 150,
        expiration: '2025-12-20',
        days_to_expiry: 4,
        underlying_price: 152.50,
        contract_id: 'AAPL251220C00150000',
        greeks: {
            delta: 0.45
        }
    }
};

const MOCK_SIGNAL_2 = {
    action: 'BUY PUT',
    entry_price: 1.75,
    target_price: 2.25,
    stop_loss: 1.50,
    confidence: 0.72,
    contract: {
        symbol: 'TSLA',
        strike: 200,
        expiration: '2025-12-27',
        days_to_expiry: 11,
        underlying_price: 198.00,
        contract_id: 'TSLA251227P00200000',
        greeks: {
            delta: -0.38
        }
    }
};

// Helper: Navigate to signals page through router
async function navigateToSignals(page: Page) {
    // Navigate to root (index.html) first - static server serves files, not routes
    // Per app.js lines 8-10, root route loads signals.html by default
    await page.goto(BASE_URL + '/');

    // Wait for router to initialize and load signals fragment into #app container
    await page.waitForSelector('#signals-container', { timeout: 10000 });
}

// Helper: Setup console error tracking (per Verification Semantics)
function setupConsoleErrorTracking(page: Page): string[] {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            // Filter out expected browser errors from intentional test failures
            if (!text.includes('Failed to load resource') && !text.includes('net::ERR_FAILED')) {
                consoleErrors.push(text);
            }
        }
    });

    page.on('pageerror', error => {
        consoleErrors.push(`Uncaught exception: ${error.message}`);
    });

    return consoleErrors;
}

// Helper: Mock market status API (evidence: line 307)
async function mockMarketStatusAPI(page: Page) {
    await page.route('**/api/market/status', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                is_market_open: true,
                is_trading_hours: true,
                current_time_et: '2:30 PM ET',
                message: 'Market is open for trading'
            })
        });
    });
}

// Helper: Mock top movers API (evidence: line 358)
async function mockTopMoversAPI(page: Page) {
    await page.route('**/api/market/top-movers', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                movers: [
                    { symbol: 'AAPL', price: 152.50, change_percent: 3.2 },
                    { symbol: 'TSLA', price: 198.00, change_percent: -2.1 }
                ]
            })
        });
    });
}

test.describe('Trading Signals Page - Initialization & Navigation', () => {
    test('loads page through router without errors', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs (evidence: lines 307, 358, 418)
        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        // Navigate via router
        await navigateToSignals(page);

        // Verify page header loaded
        await expect(page.locator('.page-title')).toContainText('Options Signals');

        // Verify key sections rendered
        await expect(page.locator('#market-status-banner')).toBeVisible();
        await expect(page.locator('#market-movers-ticker')).toBeVisible();
        await expect(page.locator('#signals-container')).toBeVisible();

        // Verify no console errors (Verification Semantics: MUST assert)
        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - State Handling', () => {
    test('renders LOADING state on initial fetch', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);

        // Delay API response to catch loading state
        await page.route('**/api/options/signals*', async route => {
            await new Promise(resolve => setTimeout(resolve, 100));
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        // Navigate to root - static server doesn't handle /signals route
        await page.goto(BASE_URL + '/');

        // Verify loading state appears (evidence: line 410)
        const loadingElement = page.locator('#signals-container .loading');
        await expect(loadingElement).toBeVisible();
        await expect(loadingElement).toContainText('Loading signals');

        // Wait for success state
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        expect(consoleErrors).toHaveLength(0);
    });

    test('renders SUCCESS state with signal cards', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL, MOCK_SIGNAL_2])
            });
        });

        await navigateToSignals(page);

        // Wait for success state
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Verify signal cards rendered (evidence: lines 532-575)
        const signalCards = page.locator('.card.mb-2');
        await expect(signalCards).toHaveCount(2);

        // Verify first signal content (user-visible correctness)
        const firstCard = signalCards.first();
        await expect(firstCard).toContainText('AAPL');
        await expect(firstCard).toContainText('$150');
        await expect(firstCard).toContainText('$2.50');
        await expect(firstCard).toContainText('85%');

        // Verify second signal content
        const secondCard = signalCards.nth(1);
        await expect(secondCard).toContainText('TSLA');
        await expect(secondCard).toContainText('$200');
        await expect(secondCard).toContainText('$1.75');
        await expect(secondCard).toContainText('72%');

        expect(consoleErrors).toHaveLength(0);
    });

    test('renders EMPTY state when no signals returned', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]) // Empty array
            });
        });

        await navigateToSignals(page);

        // Wait for empty state (evidence: lines 503-510)
        await page.waitForSelector('#signals-container .card', { timeout: 5000 });

        // Verify empty state UI
        const emptyState = page.locator('#signals-container .card');
        await expect(emptyState).toBeVisible();
        await expect(emptyState).toContainText('No Signals Found');
        await expect(emptyState).toContainText('Try adjusting your filters');

        expect(consoleErrors).toHaveLength(0);
    });

    test('renders ERROR state when API fails', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.abort('failed'); // Simulate network failure
        });

        await navigateToSignals(page);

        // Wait for error state (evidence: lines 428-440)
        await page.waitForSelector('#signals-container .card', { timeout: 5000 });

        // Verify error state UI
        const errorState = page.locator('#signals-container .card');
        await expect(errorState).toBeVisible();
        await expect(errorState).toContainText('Error');
        await expect(errorState).toContainText('Unable to load signals');

        // Verify retry button exists
        const retryButton = errorState.locator('button:has-text("Retry")');
        await expect(retryButton).toBeVisible();

        expect(consoleErrors).toHaveLength(0);
    });

    test('ERROR state retry button reloads signals', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);

        let requestCount = 0;
        await page.route('**/api/options/signals*', route => {
            requestCount++;
            if (requestCount === 1) {
                route.abort('failed'); // First request fails
            } else {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([MOCK_SIGNAL])
                });
            }
        });

        await navigateToSignals(page);

        // Wait for error state
        await page.waitForSelector('#signals-container .card:has-text("Error")', { timeout: 5000 });

        // Click retry button
        const retryButton = page.locator('button:has-text("Retry")');
        await retryButton.click();

        // Wait for success state after retry
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Verify signal card rendered
        const signalCard = page.locator('.card.mb-2');
        await expect(signalCard).toBeVisible();
        await expect(signalCard).toContainText('AAPL');

        expect(requestCount).toBe(2);
        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - Filter Interactions', () => {
    test('strategy filter triggers API call', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);

        let lastRequestParams: URLSearchParams | null = null;
        await page.route('**/api/options/signals*', route => {
            const url = new URL(route.request().url());
            lastRequestParams = url.searchParams;

            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Change strategy filter (evidence: line 233)
        const strategySelect = page.locator('#filter-strategy');
        await strategySelect.selectOption('SCALPING');

        // Wait for new request
        await page.waitForTimeout(500);

        // Verify API called with strategy parameter (evidence: line 413)
        expect(lastRequestParams?.get('strategy')).toBe('SCALPING');

        expect(consoleErrors).toHaveLength(0);
    });

    test('confidence filter triggers API call', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);

        let lastRequestParams: URLSearchParams | null = null;
        await page.route('**/api/options/signals*', route => {
            const url = new URL(route.request().url());
            lastRequestParams = url.searchParams;

            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Change confidence filter (evidence: line 243)
        const confidenceSelect = page.locator('#filter-confidence');
        await confidenceSelect.selectOption('0.80');

        // Wait for new request
        await page.waitForTimeout(500);

        // Verify API called with min_confidence (evidence: line 414)
        // Accept both "0.8" and "0.80" (JavaScript trims trailing zeros)
        const minConfidence = lastRequestParams?.get('min_confidence');
        expect(minConfidence === '0.8' || minConfidence === '0.80').toBe(true);

        expect(consoleErrors).toHaveLength(0);
    });

    test('quick price buttons update max price', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Click $5 quick price button (evidence: line 132)
        // Use filter to select exactly "$5" not "$50"
        const fiveDollarButton = page.locator('button.btn-quick-price').filter({ hasText: /^\$5$/ });
        await fiveDollarButton.click();

        // Verify input value updated (evidence: line 278-280)
        const maxPriceInput = page.locator('#filter-max-price');
        await expect(maxPriceInput).toHaveValue('5.00');

        expect(consoleErrors).toHaveLength(0);
    });

    test('reset filters button restores defaults', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Change some filters
        await page.locator('#filter-strategy').selectOption('SWING');
        await page.locator('#filter-confidence').selectOption('0.90');

        // Click reset button (evidence: line 169, 284-306)
        const resetButton = page.locator('#signals-reset-filters-btn');
        await resetButton.click();

        // Wait for reset to apply
        await page.waitForTimeout(500);

        // Verify filters reset to defaults (evidence: lines 286-293)
        await expect(page.locator('#filter-strategy')).toHaveValue('SCALPING');
        await expect(page.locator('#filter-confidence')).toHaveValue('0.70');
        await expect(page.locator('#filter-max-price')).toHaveValue('5.00');

        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - Accessibility', () => {
    test('keyboard navigation works', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Focus on filters section first (navbar links come before filters in tab order)
        await page.locator('#filter-strategy').focus();
        await expect(page.locator('#filter-strategy')).toBeFocused();

        // Tab to next filter
        await page.keyboard.press('Tab');
        await expect(page.locator('#filter-moneyness')).toBeFocused();

        expect(consoleErrors).toHaveLength(0);
    });

    test('focus states are visible', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Focus on strategy select
        await page.locator('#filter-strategy').focus();

        // Verify outline or focus ring present
        const outlineStyle = await page.locator('#filter-strategy').evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                outline: styles.outline,
                outlineStyle: styles.outlineStyle
            };
        });

        // Focus state should have visible outline (not 'none')
        expect(outlineStyle.outlineStyle).not.toBe('none');

        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - API Integration', () => {
    test('API calls use correct endpoints and parameters', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);

        const apiRequests: { url: string; params: URLSearchParams }[] = [];
        await page.route('**/api/options/signals*', route => {
            const url = new URL(route.request().url());
            apiRequests.push({ url: url.pathname, params: url.searchParams });

            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Verify at least one signals API request made
        expect(apiRequests.length).toBeGreaterThan(0);

        // Verify correct endpoint (evidence: line 418)
        const firstRequest = apiRequests[0];
        expect(firstRequest.url).toContain('/api/options/signals');

        // Verify default parameters (evidence: lines 414-416)
        // Accept both "0.5" and "0.50" (JavaScript trims trailing zeros)
        const minConf = firstRequest.params.get('min_confidence');
        expect(minConf === '0.5' || minConf === '0.50').toBe(true);

        const maxPrice = firstRequest.params.get('max_price');
        expect(maxPrice === '50' || maxPrice === '50.00' || maxPrice === '50.0').toBe(true);

        expect(firstRequest.params.get('max_results')).toBe('20');

        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - Runtime Stability', () => {
    test('page produces no console errors during normal operation', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Interact with filters
        await page.locator('#filter-strategy').selectOption('SCALPING');
        await page.waitForTimeout(500);

        await page.locator('#filter-confidence').selectOption('0.80');
        await page.waitForTimeout(500);

        // Verify no console errors occurred (Verification Semantics: MUST assert)
        expect(consoleErrors).toHaveLength(0);
    });

    test('page handles uncaught exceptions gracefully', async ({ page }) => {
        const consoleErrors: string[] = [];

        page.on('pageerror', error => {
            consoleErrors.push(`Uncaught exception: ${error.message}`);
        });

        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([MOCK_SIGNAL])
            });
        });

        await navigateToSignals(page);
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Verify no uncaught exceptions (Verification Semantics: MUST assert)
        expect(consoleErrors).toHaveLength(0);
    });
});
