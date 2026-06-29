import { defineConfig } from 'vitest/config';

// Node-environment unit/integration tests for the pure engine (@scanner/core)
// and the data layer (@scanner/data). Svelte component/browser tests live in
// apps/web with their own config.
export default defineConfig({
	test: {
		include: ['packages/**/src/**/*.{test,spec}.ts'],
		environment: 'node',
		globals: false
	}
});
