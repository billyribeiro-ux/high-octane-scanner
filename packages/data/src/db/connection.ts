import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';
import { getDataEnv } from '../env.js';

let connPromise: Promise<DuckDBConnection> | null = null;
let testConn: DuckDBConnection | null = null;

/** Override the shared connection (tests use an in-memory database). */
export function __setConnectionForTests(conn: DuckDBConnection | null): void {
	testConn = conn;
}

/**
 * Process-wide DuckDB connection. `DuckDBInstance.fromCache` dedupes by path so
 * repeated calls (and Vite SSR module reloads) reuse the same instance.
 *
 * NOTE: a DuckDB file is single-writer across processes. In normal operation the
 * SvelteKit server owns the database; run the one-off worker scripts (seed,
 * backfill, migrate) only while the server is stopped.
 */
export async function getConnection(): Promise<DuckDBConnection> {
	if (testConn) return testConn;
	if (!connPromise) {
		connPromise = (async () => {
			const { duckdbPath } = getDataEnv();
			if (duckdbPath !== ':memory:') await mkdir(dirname(duckdbPath), { recursive: true });
			const instance = await DuckDBInstance.fromCache(duckdbPath);
			return instance.connect();
		})();
	}
	return connPromise;
}

/** Open an isolated in-memory connection — used by tests. */
export async function createMemoryConnection(): Promise<DuckDBConnection> {
	const instance = await DuckDBInstance.create(':memory:');
	return instance.connect();
}
