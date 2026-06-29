import type { IndicatorRow } from '../types.js';

/** Bullish stack: EMA5 > EMA9 > EMA21 > SMA50 > SMA100 > SMA200. */
export function isBullishStack(r: IndicatorRow): boolean {
	return (
		r.ema5 > r.ema9 &&
		r.ema9 > r.ema21 &&
		r.ema21 > r.sma50 &&
		r.sma50 > r.sma100 &&
		r.sma100 > r.sma200
	);
}

/** Bearish stack: EMA5 < EMA9 < EMA21 < SMA50 < SMA100 < SMA200. */
export function isBearishStack(r: IndicatorRow): boolean {
	return (
		r.ema5 < r.ema9 &&
		r.ema9 < r.ema21 &&
		r.ema21 < r.sma50 &&
		r.sma50 < r.sma100 &&
		r.sma100 < r.sma200
	);
}
