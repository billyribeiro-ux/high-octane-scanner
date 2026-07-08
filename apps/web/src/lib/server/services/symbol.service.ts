import { ohlcvRepo, symbolsRepo } from '@scanner/data';
import { computeIndicatorSeries, detectSignalsForSeries, DEFAULT_SIGNAL_CONFIG } from '@scanner/core';
import { ensureReady } from '$lib/server/db';

/** Bars + aligned indicator series + signals + metadata for the symbol chart. */
export async function getSymbolChart(symbol: string, opts: { lookback?: number } = {}) {
	await ensureReady();
	const sym = symbol.toUpperCase();
	const bars = await ohlcvRepo.getRecentBars(sym, opts.lookback ?? 400);
	const indicators = computeIndicatorSeries(bars);
	const signals = detectSignalsForSeries(bars, indicators, DEFAULT_SIGNAL_CONFIG);
	const meta = await symbolsRepo.getSymbol(sym);
	return { symbol: sym, meta, bars, indicators, signals };
}
