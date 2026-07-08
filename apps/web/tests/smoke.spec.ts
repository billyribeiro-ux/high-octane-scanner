import { test, expect } from '@playwright/test';

test('dashboard loads with navigation and stats', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
	await expect(page.getByRole('link', { name: 'Scanner', exact: true })).toBeVisible();
});

test('scanner renders a signals table', async ({ page }) => {
	await page.goto('/scanner');
	await expect(page.locator('table')).toBeVisible();
});

test('screener renders results', async ({ page }) => {
	await page.goto('/screener');
	await expect(page.locator('table')).toBeVisible();
});

test('symbol page renders a candlestick canvas', async ({ page }) => {
	await page.goto('/symbol/AAPL');
	await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
});

test('single backtest runs and shows results', async ({ page }) => {
	await page.goto('/backtest');
	// Wait for hydration so the form's submit handler is attached (otherwise the
	// click triggers a native GET navigation instead of the in-page handler).
	const runButton = page.getByRole('button', { name: 'Run Backtest' });
	await expect(runButton).toBeVisible();
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.waitForTimeout(1500);
	await page.fill('input[list="symbols"]', 'AAPL');
	await runButton.click();
	await expect(page.getByText('Equity Curve')).toBeVisible({ timeout: 25_000 });
});
