import {
	computeIndicatorSeries,
	DEFAULT_SIGNAL_CONFIG,
	latestSignal,
	MIN_BARS,
	type SignalConfig
} from '@scanner/core';
import { getRecentBarsAll } from '../repositories/ohlcv.repo.js';
import { upsertSignals, type PersistableSignal } from '../repositories/signals.repo.js';
import { setSyncState, SYNC_KEYS } from '../repositories/syncState.repo.js';

export interface ScanOptions {
	/** How many trailing bars to load per symbol (EMA warm-up). Default 300. */
	lookback?: number;
	signal?: SignalConfig;
}

export interface ScanResult {
	scanned: number;
	signalsFound: number;
	date: string | null;
}

/**
 * Scan every symbol with enough cached history for the setup on its latest bar,
 * using the same indicator + signal code the backtester uses, and persist the
 * hits. Returns counts and the latest signal date seen.
 */
export async function runScan(opts: ScanOptions = {}): Promise<ScanResult> {
	const lookback = opts.lookback ?? 300;
	const cfg = opts.signal ?? DEFAULT_SIGNAL_CONFIG;
	const minBars = MIN_BARS + cfg.closesRequired;

	const barsBySymbol = await getRecentBarsAll(lookback, minBars);
	const persist: PersistableSignal[] = [];
	let latestDate: string | null = null;

	for (const [symbol, bars] of barsBySymbol) {
		const series = computeIndicatorSeries(bars, cfg.source);
		const sig = latestSignal(bars, series, cfg);
		if (!sig) continue;
		persist.push({
			symbol,
			date: sig.date,
			direction: sig.direction,
			fresh: sig.fresh,
			close: sig.close,
			indicators: sig.indicators
		});
		if (!latestDate || sig.date > latestDate) latestDate = sig.date;
	}

	if (persist.length > 0) await upsertSignals(persist);
	if (latestDate) await setSyncState(SYNC_KEYS.lastScanDate, latestDate);

	return { scanned: barsBySymbol.size, signalsFound: persist.length, date: latestDate };
}
