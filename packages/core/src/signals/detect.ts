import type { Bar, Direction, IndicatorRow, Signal, SignalConfig } from '../types.js';
import { DEFAULT_SIGNAL_CONFIG } from '../types.js';
import { isBearishStack, isBullishStack } from './stack.js';

/**
 * The strategy (as specified, mean-reversion / exhaustion):
 *
 *  - SHORT: MAs stacked **bullish** AND the last N closes are all **above** EMA5.
 *  - LONG:  MAs stacked **bearish** AND the last N closes are all **below** EMA5.
 *
 * Each close is compared against the EMA5 of its own bar, i.e. price has stayed
 * on one side of the fast EMA for N consecutive bars while the trend MAs are
 * fully extended. `SignalConfig.invert` swaps the LONG/SHORT labels.
 */

/** The qualifying direction at each bar (null if no setup), pre-invert. */
function rawDirectionPerBar(
	bars: Bar[],
	series: (IndicatorRow | null)[],
	cfg: SignalConfig
): (Direction | null)[] {
	const n = bars.length;
	const need = cfg.closesRequired;
	const priceOf = (b: Bar) => (cfg.source === 'adjClose' ? b.adjClose : b.close);
	const dir: (Direction | null)[] = new Array(n).fill(null);

	for (let i = 0; i < n; i++) {
		const row = series[i];
		if (!row || i < need - 1) continue;

		let allAbove = true;
		let allBelow = true;
		for (let k = i - need + 1; k <= i; k++) {
			const rk = series[k];
			if (!rk) {
				allAbove = false;
				allBelow = false;
				break;
			}
			const c = priceOf(bars[k] as Bar);
			if (!(c > rk.ema5)) allAbove = false;
			if (!(c < rk.ema5)) allBelow = false;
		}

		if (isBullishStack(row) && allAbove) dir[i] = 'SHORT';
		else if (isBearishStack(row) && allBelow) dir[i] = 'LONG';
	}
	return dir;
}

function applyInvert(d: Direction, invert: boolean): Direction {
	if (!invert) return d;
	return d === 'SHORT' ? 'LONG' : 'SHORT';
}

/**
 * Detect every bar that satisfies the setup. Each returned signal carries a
 * `fresh` flag — true on the first bar of a new run (the actual signal event),
 * false while the same-direction setup persists.
 */
export function detectSignalsForSeries(
	bars: Bar[],
	series: (IndicatorRow | null)[],
	cfg: SignalConfig = DEFAULT_SIGNAL_CONFIG
): Signal[] {
	const dir = rawDirectionPerBar(bars, series, cfg);
	const priceOf = (b: Bar) => (cfg.source === 'adjClose' ? b.adjClose : b.close);
	const out: Signal[] = [];

	for (let i = 0; i < bars.length; i++) {
		const d = dir[i];
		if (!d) continue;
		const row = series[i] as IndicatorRow;
		const fresh = dir[i - 1] !== d; // prev bar had a different (or no) setup
		out.push({
			date: (bars[i] as Bar).date,
			index: i,
			direction: applyInvert(d, cfg.invert),
			close: priceOf(bars[i] as Bar),
			fresh,
			indicators: row
		});
	}
	return out;
}

/**
 * Convenience for the scanner: the setup state of the most recent bar, or null
 * if the latest bar does not qualify.
 */
export function latestSignal(
	bars: Bar[],
	series: (IndicatorRow | null)[],
	cfg: SignalConfig = DEFAULT_SIGNAL_CONFIG
): Signal | null {
	const signals = detectSignalsForSeries(bars, series, cfg);
	const last = signals.at(-1);
	if (!last) return null;
	return last.index === bars.length - 1 ? last : null;
}
