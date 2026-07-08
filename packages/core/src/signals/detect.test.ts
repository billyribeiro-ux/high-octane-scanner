import { describe, expect, it } from 'vitest';
import { detectSignalsForSeries } from './detect.js';
import type { Bar, IndicatorRow, SignalConfig } from '../types.js';
import { DEFAULT_SIGNAL_CONFIG } from '../types.js';

function bar(close: number, i: number): Bar {
	return {
		date: `2026-02-${String(i + 1).padStart(2, '0')}`,
		open: close,
		high: close,
		low: close,
		close,
		adjClose: close,
		volume: 0
	};
}

/** A bullish stack sitting just below `close` (so close > ema5). */
function bullRow(close: number): IndicatorRow {
	return {
		ema5: close - 1,
		ema9: close - 2,
		ema21: close - 3,
		sma50: close - 4,
		sma100: close - 5,
		sma200: close - 6
	};
}

/** A bearish stack sitting just above `close` (so close < ema5). */
function bearRow(close: number): IndicatorRow {
	return {
		ema5: close + 1,
		ema9: close + 2,
		ema21: close + 3,
		sma50: close + 4,
		sma100: close + 5,
		sma200: close + 6
	};
}

const cfg: SignalConfig = { ...DEFAULT_SIGNAL_CONFIG }; // closesRequired = 5

describe('detectSignalsForSeries', () => {
	it('emits SHORT on bullish stack + 5 closes above EMA5', () => {
		const closes = [100, 101, 102, 103, 104, 105];
		const bars = closes.map(bar);
		const series = closes.map(bullRow);
		const signals = detectSignalsForSeries(bars, series, cfg);

		expect(signals.map((s) => s.index)).toEqual([4, 5]);
		expect(signals.every((s) => s.direction === 'SHORT')).toBe(true);
		expect(signals[0]?.fresh).toBe(true); // first bar of the run
		expect(signals[1]?.fresh).toBe(false); // setup persists
	});

	it('emits LONG on bearish stack + 5 closes below EMA5', () => {
		const closes = [105, 104, 103, 102, 101, 100];
		const bars = closes.map(bar);
		const series = closes.map(bearRow);
		const signals = detectSignalsForSeries(bars, series, cfg);

		expect(signals.map((s) => s.index)).toEqual([4, 5]);
		expect(signals.every((s) => s.direction === 'LONG')).toBe(true);
	});

	it('emits nothing when one of the 5 closes is not above EMA5', () => {
		const closes = [100, 101, 102, 103, 104, 105];
		const bars = closes.map(bar);
		const series = closes.map(bullRow);
		// Break bar index 2: put EMA5 above the close (close no longer above EMA5).
		series[2] = { ...series[2]!, ema5: closes[2]! + 1 };
		const signals = detectSignalsForSeries(bars, series, cfg);
		expect(signals).toHaveLength(0);
	});

	it('emits nothing when the stack is not fully aligned', () => {
		const closes = [100, 101, 102, 103, 104, 105];
		const bars = closes.map(bar);
		const series = closes.map(bullRow);
		// Break the stack at the signal bar: ema9 > ema5.
		series[4] = { ...series[4]!, ema9: series[4]!.ema5 + 0.5 };
		series[5] = { ...series[5]!, ema9: series[5]!.ema5 + 0.5 };
		const signals = detectSignalsForSeries(bars, series, cfg);
		expect(signals).toHaveLength(0);
	});

	it('inverts direction labels when configured', () => {
		const closes = [100, 101, 102, 103, 104, 105];
		const bars = closes.map(bar);
		const series = closes.map(bullRow);
		const signals = detectSignalsForSeries(bars, series, { ...cfg, invert: true });
		expect(signals.every((s) => s.direction === 'LONG')).toBe(true);
	});
});
