import type { FmpClient } from '../fmp/client.js';
import { historyFull } from '../fmp/endpoints.js';
import { upsertBars } from '../repositories/ohlcv.repo.js';

export interface BackfillResult {
	symbol: string;
	bars: number;
	error?: string;
}

export interface BackfillOptions {
	from?: string;
	to?: string;
	onProgress?: (done: number, total: number, symbol: string) => void;
}

/**
 * Backfill full daily history for each symbol via one `historical-price-eod/full`
 * call apiece (FMP returns years of data per request). Resilient: a failure on
 * one symbol is recorded and the rest continue.
 */
export async function backfillSymbols(
	client: FmpClient,
	symbols: string[],
	opts: BackfillOptions = {}
): Promise<BackfillResult[]> {
	const results: BackfillResult[] = [];
	for (const symbol of symbols) {
		try {
			const bars = await historyFull(client, symbol, { from: opts.from, to: opts.to });
			const n = await upsertBars(symbol, bars);
			results.push({ symbol, bars: n });
		} catch (err) {
			results.push({ symbol, bars: 0, error: String(err) });
		}
		opts.onProgress?.(results.length, symbols.length, symbol);
	}
	return results;
}
