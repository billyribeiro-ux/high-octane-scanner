import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	// DuckDB ships a native addon (.node). It must never be bundled — keep it
	// external on the SSR side and out of the client optimizer.
	ssr: {
		external: ['@duckdb/node-api', '@duckdb/node-bindings']
	},
	optimizeDeps: {
		exclude: ['@duckdb/node-api', '@duckdb/node-bindings', '@scanner/data']
	},
	server: {
		fs: {
			// Allow importing from sibling workspace packages.
			allow: ['..', '../..']
		}
	}
});
