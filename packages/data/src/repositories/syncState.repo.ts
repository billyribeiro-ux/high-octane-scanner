import { exec, queryScalar } from '../db/query.js';

/** Read a key from the small key/value sync-state table. */
export async function getSyncState(key: string): Promise<string | null> {
	return queryScalar<string>('SELECT value FROM sync_state WHERE key = $k', { k: key });
}

export async function setSyncState(key: string, value: string): Promise<void> {
	await exec(
		`INSERT OR REPLACE INTO sync_state (key, value, updated_at) VALUES ($k, $v, now())`,
		{ k: key, v: value }
	);
}

export const SYNC_KEYS = {
	lastEodBulkDate: 'last_eod_bulk_date',
	lastUniverseRefresh: 'last_universe_refresh',
	lastScanDate: 'last_scan_date'
} as const;
