import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig } from 'dotenv';

/** Walk up from `start` until a pnpm workspace root (or git root) is found. */
export function findRepoRoot(start: string = process.cwd()): string {
	const candidates = [start, dirname(fileURLToPath(import.meta.url))];
	for (const begin of candidates) {
		let dir = begin;
		for (let i = 0; i < 10; i++) {
			if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.git'))) {
				return dir;
			}
			const parent = dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}
	return start;
}

let dotenvLoaded = false;

/**
 * Load the monorepo-root `.env` into `process.env` (idempotent, non-overriding).
 * Safe to call from the worker scripts and from the SvelteKit server alike so
 * `@scanner/data` always sees `FMP_API_KEY` / `DUCKDB_PATH` regardless of cwd.
 */
export function loadDotenv(): void {
	if (dotenvLoaded) return;
	dotenvLoaded = true;
	dotenvConfig({ path: join(findRepoRoot(), '.env'), quiet: true });
}

export interface DataEnv {
	/** Absolute path to the DuckDB database file. */
	duckdbPath: string;
	fmpApiKey: string;
	fmpRateLimitPerMin: number;
}

export function getDataEnv(): DataEnv {
	loadDotenv();
	const root = findRepoRoot();
	const raw = process.env.DUCKDB_PATH ?? './data/scanner.duckdb';
	return {
		duckdbPath: isAbsolute(raw) ? raw : resolve(root, raw),
		fmpApiKey: process.env.FMP_API_KEY ?? '',
		fmpRateLimitPerMin: Number(process.env.FMP_RATE_LIMIT_PER_MIN ?? '300')
	};
}
