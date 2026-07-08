import type { FmpClient } from '../fmp/client.js';
import { screenCompanies, type ScreenerParams } from '../fmp/endpoints.js';
import { upsertSymbols, type SymbolRow } from '../repositories/symbols.repo.js';
import { setSyncState, SYNC_KEYS } from '../repositories/syncState.repo.js';

export interface BuildUniverseOptions {
	marketCapMoreThan?: number;
	volumeMoreThan?: number;
	exchanges?: string[];
	includeEtf?: boolean;
	country?: string;
	limit?: number;
}

/**
 * Build/refresh the tradable universe from the FMP screener (one call per
 * exchange) and upsert it into `symbols`. Returns the number of symbols stored.
 */
export async function buildUniverse(
	client: FmpClient,
	opts: BuildUniverseOptions = {}
): Promise<number> {
	const exchanges = opts.exchanges ?? ['NASDAQ', 'NYSE', 'AMEX'];
	const base: ScreenerParams = {
		marketCapMoreThan: opts.marketCapMoreThan ?? 300_000_000,
		volumeMoreThan: opts.volumeMoreThan ?? 200_000,
		country: opts.country ?? 'US',
		isActivelyTrading: true,
		limit: opts.limit ?? 10_000
	};

	const seen = new Map<string, SymbolRow>();
	for (const exchange of exchanges) {
		const rows = await screenCompanies(client, { ...base, exchange });
		for (const r of rows) {
			if (opts.includeEtf === false && r.isEtf) continue;
			seen.set(r.symbol, r);
		}
	}

	const all = [...seen.values()];
	if (all.length > 0) await upsertSymbols(all);
	await setSyncState(SYNC_KEYS.lastUniverseRefresh, new Date().toISOString());
	return all.length;
}
