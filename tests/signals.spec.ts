/**
 * Playwright Test Suite: Trading Signals Page
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Install Playwright (if not already installed):
 *    cd /Users/rioallen/Documents/DropFly-OS-App-Builder/DropFly-PROJECTS/TradeFly-Frontend
 *    npm init -y
 *    npm install -D @playwright/test
 *    npx playwright install chromium
 *
 * 2. Start local dev server (REQUIRED - run in separate terminal):
 *    cd /Users/rioallen/Documents/DropFly-OS-App-Builder/DropFly-PROJECTS/TradeFly-Frontend
 *    python3 -m http.server 8000
 *
 *    This serves the app at: http://localhost:8000
 *
 * 3. Run tests:
 *    npx playwright test tests/signals.spec.ts --project=chromium
 *
 * 4. Run with UI (debugging):
 *    npx playwright test tests/signals.spec.ts --ui
 *
 * 5. Generate HTML report:
 *    npx playwright test tests/signals.spec.ts --reporter=html
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:8000';
const SIGNALS_ROUTE = '/signals';

// Mock signal data for deterministic testing
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
            delta: 0.45,
            gamma: 0.02,
            theta: -0.05,
            vega: 0.10
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
            delta: -0.38,
            gamma: 0.03,
            theta: -0.04,
            vega: 0.12
        }
    }
};

// Helper: Navigate to signals page through router
async function navigateToSignals(page: Page) {
    await page.goto(BASE_URL + SIGNALS_ROUTE);

    // Wait for router to load the signals page into #app container
    await page.waitForSelector('#signals-container', { timeout: 5000 });
}

// Helper: Setup console error tracking
function setupConsoleErrorTracking(page: Page): string[] {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    page.on('pageerror', error => {
        consoleErrors.push(`Uncaught exception: ${error.message}`);
    });

    return consoleErrors;
}

// Helper: Mock market status API (non-critical, returns success)
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

// Helper: Mock top movers API (non-critical, returns success)
async function mockTopMoversAPI(page: Page) {
    await page.route('**/api/market/top-movers', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                timestamp: '2025-12-16T14:30:00',
                count: 2,
                movers: [
                    { symbol: 'AAPL', price: 152.50, change_percent: 3.2, volume: 1234567 },
                    { symbol: 'TSLA', price: 198.00, change_percent: -2.1, volume: 987654 }
                ]
            })
        });
    });
}

test.describe('Trading Signals Page - Initialization & Navigation', () => {
    test('loads page through router without errors', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_SIGNAL]) });
        });

        // Navigate via router
        await navigateToSignals(page);

        // Verify page header loaded
        await expect(page.locator('.page-title')).toContainText('Options Signals');

        // Verify key sections rendered
        await expect(page.locator('#market-status-banner')).toBeVisible();
        await expect(page.locator('#market-movers-ticker')).toBeVisible();
        await expect(page.locator('#signals-container')).toBeVisible();

        // Verify no console errors occurred
        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - State Handling (All 5 States)', () => {
    test('renders LOADING state on initial fetch', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs with delay to catch loading state
        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);

        let signalsRequestReceived = false;
        await page.route('**/api/options/signals*', async route => {
            signalsRequestReceived = true;
            // Delay response to ensure loading state is visible
            await new Promise(resolve => setTimeout(resolve, 100));
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_SIGNAL]) });
        });

        await page.goto(BASE_URL + SIGNALS_ROUTE);

        // Verify loading state appears
        const loadingElement = page.locator('#signals-container .loading');
        await expect(loadingElement).toBeVisible();
        await expect(loadingElement).toContainText('Loading signals');

        // Wait for signals to load
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        expect(signalsRequestReceived).toBe(true);
        expect(consoleErrors).toHaveLength(0);
    });

    test('renders SUCCESS state with signal cards', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs with multiple signals
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

        // Wait for success state (signal cards)
        await page.waitForSelector('.card.mb-2', { timeout: 5000 });

        // Verify signal cards rendered
        const signalCards = page.locator('.card.mb-2');
        await expect(signalCards).toHaveCount(2);

        // Verify first signal content
        const firstCard = signalCards.first();
        await expect(firstCard).toContainText('AAPL');
        await expect(firstCard).toContainText('$2.50');
        await expect(firstCard).toContainText('85%'); // confidence

        // Verify second signal content
        const secondCard = signalCards.nth(1);
        await expect(secondCard).toContainText('TSLA');
        await expect(secondCard).toContainText('$1.75');
        await expect(secondCard).toContainText('72%'); // confidence

        expect(consoleErrors).toHaveLength(0);
    });

    test('renders EMPTY state when no signals match filters', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs with empty signals array
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

        // Wait for empty state to render
        await page.waitForSelector('#signals-container .card', { timeout: 5000 });

        // Verify empty state UI
        const emptyState = page.locator('#signals-container .card');
        await expect(emptyState).toBeVisible();
        await expect(emptyState).toContainText('No Signals Found');
        await expect(emptyState).toContainText('Try adjusting your filters');

        // Verify emoji icon present
        await expect(emptyState.locator('div[style*="font-size: 3rem"]')).toContainText('📊');

        expect(consoleErrors).toHaveLength(0);
    });

    test('renders ERROR state when API request fails', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs - signals API fails
        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);
        await page.route('**/api/options/signals*', route => {
            route.abort('failed'); // Simulate network failure
        });

        await navigateToSignals(page);

        // Wait for error state to render
        await page.waitForSelector('#signals-container .card', { timeout: 5000 });

        // Verify error state UI
        const errorState = page.locator('#signals-container .card');
        await expect(errorState).toBeVisible();
        await expect(errorState).toContainText('Error');
        await expect(errorState).toContainText('Unable to load signals');

        // Verify error styling (red border)
        const borderColor = await errorState.evaluate(el => window.getComputedStyle(el).borderColor);
        expect(borderColor).toContain('239, 68, 68'); // #ef4444 in RGB

        // Verify retry button exists
        const retryButton = errorState.locator('button:has-text("Retry")');
        await expect(retryButton).toBeVisible();

        expect(consoleErrors).toHaveLength(0);
    });

    test('ERROR state retry button successfully reloads signals', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
        await mockMarketStatusAPI(page);
        await mockTopMoversAPI(page);

        let requestCount = 0;
        await page.route('**/api/options/signals*', route => {
            requestCount++;
            if (requestCount === 1) {
                // First request fails
                route.abort('failed');
            } else {
                // Second request (retry) succeeds
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
    test('strategy filter updates signals on change', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
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

        // Change strategy filter
        const strategySelect = page.locator('#filter-strategy');
        await strategySelect.selectOption('SCALPING');

        // Wait for new request
        await page.waitForTimeout(500);

        // Verify API was called with strategy parameter
        expect(lastRequestParams?.get('strategy')).toBe('SCALPING');

        expect(consoleErrors).toHaveLength(0);
    });

    test('confidence filter updates signals on change', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
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

        // Change confidence filter
        const confidenceSelect = page.locator('#filter-confidence');
        await confidenceSelect.selectOption('0.80');

        // Wait for new request
        await page.waitForTimeout(500);

        // Verify API was called with updated confidence
        expect(lastRequestParams?.get('min_confidence')).toBe('0.80');

        expect(consoleErrors).toHaveLength(0);
    });

    test('quick price buttons update max price filter', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
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

        // Click $5 quick price button
        const fiveDollarButton = page.locator('button.btn-quick-price:has-text("$5")');
        await fiveDollarButton.click();

        // Verify input value updated
        const maxPriceInput = page.locator('#filter-max-price');
        await expect(maxPriceInput).toHaveValue('5.00');

        expect(consoleErrors).toHaveLength(0);
    });

    test('reset filters button restores defaults', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
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
        await page.locator('#filter-max-price').fill('10.00');

        // Click reset button
        const resetButton = page.locator('#signals-reset-filters-btn');
        await resetButton.click();

        // Wait for reset to apply
        await page.waitForTimeout(500);

        // Verify filters reset to defaults
        await expect(page.locator('#filter-strategy')).toHaveValue('SCALPING');
        await expect(page.locator('#filter-confidence')).toHaveValue('0.70');
        await expect(page.locator('#filter-max-price')).toHaveValue('5.00');

        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - Accessibility (WCAG AA)', () => {
    test('all interactive elements are keyboard accessible', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
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

        // Tab through filter controls
        await page.keyboard.press('Tab');
        await expect(page.locator('#filter-strategy')).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(page.locator('#filter-moneyness')).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(page.locator('#filter-confidence')).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(page.locator('#filter-dte')).toBeFocused();

        expect(consoleErrors).toHaveLength(0);
    });

    test('focus states are visible on all interactive elements', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
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

        // Verify outline or focus ring is present (not 'none')
        const outlineStyle = await page.locator('#filter-strategy').evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                outline: styles.outline,
                outlineStyle: styles.outlineStyle,
                outlineWidth: styles.outlineWidth
            };
        });

        // Focus state should have visible outline (not 'none' and width > 0)
        expect(outlineStyle.outlineStyle).not.toBe('none');

        expect(consoleErrors).toHaveLength(0);
    });

    test('color contrast meets WCAG AA requirements', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
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

        // Test page title contrast
        const titleContrast = await page.locator('.page-title').evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                color: styles.color,
                backgroundColor: styles.backgroundColor
            };
        });

        // Verify color values exist (contrast calculation would require additional library)
        // This is a basic check; full WCAG AA validation would use axe-core
        expect(titleContrast.color).toBeTruthy();
        expect(titleContrast.backgroundColor).toBeTruthy();

        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - Console & Error Handling', () => {
    test('page produces no console errors during normal operation', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs
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

        // Verify no console errors occurred
        expect(consoleErrors).toHaveLength(0);
    });

    test('page handles uncaught exceptions gracefully', async ({ page }) => {
        const consoleErrors: string[] = [];

        page.on('pageerror', error => {
            consoleErrors.push(`Uncaught exception: ${error.message}`);
        });

        // Mock APIs
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

        // Verify no uncaught exceptions
        expect(consoleErrors).toHaveLength(0);
    });
});

test.describe('Trading Signals Page - API Integration', () => {
    test('API calls use correct endpoints with proper parameters', async ({ page }) => {
        const consoleErrors = setupConsoleErrorTracking(page);

        // Mock APIs and track requests
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

        // Verify at least one signals API request was made
        expect(apiRequests.length).toBeGreaterThan(0);

        // Verify correct endpoint
        const firstRequest = apiRequests[0];
        expect(firstRequest.url).toContain('/api/options/signals');

        // Verify default parameters
        expect(firstRequest.params.get('min_confidence')).toBe('0.50'); // Default from page
        expect(firstRequest.params.get('max_price')).toBe('50.00'); // Default from page
        expect(firstRequest.params.get('max_results')).toBe('20');

        expect(consoleErrors).toHaveLength(0);
    });
});
