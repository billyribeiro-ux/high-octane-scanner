import { describe, expect, it } from 'vitest';
import { ema, EmaState } from './ema.js';
import { sma, SmaState } from './sma.js';
import { computeIndicatorSeries } from './indicators.js';
import type { Bar } from '../types.js';

describe('sma', () => {
	it('matches hand-computed values for a ramp', () => {
		const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		// 3-period SMA of consecutive integers equals the middle value.
		expect(sma(v, 3)).toEqual([null, null, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('matches a non-linear hand calculation', () => {
		// (10+12+11)/3 = 11 ; (12+11+20)/3 = 43/3
		const out = sma([10, 12, 11, 20], 3);
		expect(out[0]).toBeNull();
		expect(out[1]).toBeNull();
		expect(out[2]).toBeCloseTo(11, 10);
		expect(out[3]).toBeCloseTo(43 / 3, 10);
	});

	it('throws on invalid period', () => {
		expect(() => sma([1, 2], 0)).toThrow();
	});
});

describe('ema', () => {
	it('seeds with SMA then rolls forward (hand-computed)', () => {
		// seed at idx2 = (10+12+11)/3 = 11 ; k = 0.5
		// idx3 = 20*0.5 + 11*0.5 = 15.5  (differs from SMA's 14.333, proving it is an EMA)
		const out = ema([10, 12, 11, 20], 3);
		expect(out[0]).toBeNull();
		expect(out[1]).toBeNull();
		expect(out[2]).toBeCloseTo(11, 10);
		expect(out[3]).toBeCloseTo(15.5, 10);
	});

	it('returns all null when fewer than `period` values', () => {
		expect(ema([1, 2], 5)).toEqual([null, null]);
	});
});

describe('streaming states match batch', () => {
	const v = [10, 12, 11, 20, 25, 23, 30, 28, 35, 40];
	it('EmaState equals ema()', () => {
		const batch = ema(v, 4);
		const s = new EmaState(4);
		const stream = v.map((x) => s.push(x));
		stream.forEach((val, i) => {
			if (batch[i] === null) expect(val).toBeNull();
			else expect(val as number).toBeCloseTo(batch[i] as number, 10);
		});
	});
	it('SmaState equals sma()', () => {
		const batch = sma(v, 4);
		const s = new SmaState(4);
		const stream = v.map((x) => s.push(x));
		stream.forEach((val, i) => {
			if (batch[i] === null) expect(val).toBeNull();
			else expect(val as number).toBeCloseTo(batch[i] as number, 10);
		});
	});
});

describe('computeIndicatorSeries', () => {
	const mkBar = (close: number, i: number): Bar => ({
		date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
		open: close,
		high: close,
		low: close,
		close,
		adjClose: close,
		volume: 0
	});

	it('returns null until 200 bars then full rows', () => {
		const bars = Array.from({ length: 205 }, (_, i) => mkBar(100 + i, i));
		const series = computeIndicatorSeries(bars);
		expect(series[198]).toBeNull(); // sma200 not yet defined
		expect(series[199]).not.toBeNull(); // 200 bars available
		const row = series[204];
		expect(row).not.toBeNull();
		if (row) {
			// Steady uptrend ⇒ bullish stack.
			expect(row.ema5).toBeGreaterThan(row.ema9);
			expect(row.ema21).toBeGreaterThan(row.sma50);
			expect(row.sma100).toBeGreaterThan(row.sma200);
		}
	});
});
