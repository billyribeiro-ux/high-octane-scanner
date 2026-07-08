import type { Bar, IndicatorRow, PriceSource } from '../types.js';
import { ema } from './ema.js';
import { sma } from './sma.js';

/** The MA lengths used by the strategy, in stack order (fastest → slowest). */
export const MA_PERIODS = {
	ema: [5, 9, 21] as const,
	sma: [50, 100, 200] as const
};

/** Minimum bars required before all six MAs are defined. */
export const MIN_BARS = 200;

function priceSeries(bars: Bar[], source: PriceSource): number[] {
	return bars.map((b) => (source === 'adjClose' ? b.adjClose : b.close));
}

/**
 * Compute EMA(5,9,21) + SMA(50,100,200) for every bar. Each entry is `null`
 * until all six averages are defined (i.e. once there are >= 200 bars).
 */
export function computeIndicatorSeries(
	bars: Bar[],
	source: PriceSource = 'close'
): (IndicatorRow | null)[] {
	const prices = priceSeries(bars, source);
	const e5 = ema(prices, 5);
	const e9 = ema(prices, 9);
	const e21 = ema(prices, 21);
	const s50 = sma(prices, 50);
	const s100 = sma(prices, 100);
	const s200 = sma(prices, 200);

	return bars.map((_, i) => {
		const ema5 = e5[i];
		const ema9 = e9[i];
		const ema21 = e21[i];
		const sma50 = s50[i];
		const sma100 = s100[i];
		const sma200 = s200[i];
		if (
			ema5 == null ||
			ema9 == null ||
			ema21 == null ||
			sma50 == null ||
			sma100 == null ||
			sma200 == null
		) {
			return null;
		}
		return { ema5, ema9, ema21, sma50, sma100, sma200 };
	});
}
