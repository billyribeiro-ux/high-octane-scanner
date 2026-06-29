import { defineConfig, devices } from '@playwright/test';

// In sandboxes a system Chromium may be provided; point at it via
// PLAYWRIGHT_CHROMIUM_PATH. Locally, run `npx playwright install chromium`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
	testDir: 'tests',
	timeout: 45_000,
	fullyParallel: false,
	use: {
		baseURL: 'http://localhost:4173',
		launchOptions: {
			executablePath,
			// Software WebGL so the Threlte 3D heatmap renders in headless.
			args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
		}
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'pnpm dev --port 4173',
		url: 'http://localhost:4173',
		reuseExistingServer: true,
		timeout: 60_000
	}
});
