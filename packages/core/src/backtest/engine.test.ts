import { describe, expect, it } from 'vitest';
import { runBacktest, runBacktestWithSignals } from './engine.js';
import { computeIndicatorSeries } from '../indicators/indicators.js';
import type { Bar, BacktestConfig, IndicatorRow, Signal } from '../types.js';
import { DEFAULT_BACKTEST_CONFIG } from '../types.js';

const DUMMY_ROW: IndicatorRow = {
	ema5: 1,
	ema9: 2,
	ema21: 3,
	sma50: 4,
	sma100: 5,
	sma200: 6
};

function mkBars(rows: number[][]): Bar[] {
	return rows.map(([o, h, l, c], i) => ({
		date: `2026-03-${String(i + 1).padStart(2, '0')}`,
		open: o as number,
		high: h as number,
		low: l as number,
		close: c as number,
		adjClose: c as number,
		volume: 0
	}));
}

function freshLong(index: number, bars: Bar[]): Signal {
	return {
		date: bars[index]!.date,
		index,
		direction: 'LONG',
		close: bars[index]!.close,
		fresh: true,
		indicators: DUMMY_ROW
	};
}

describe('runBacktestWithSignals — deterministic 3-trade fixture', () => {
	// Hand-built so each trade exits a different way and the metrics are known.
	const bars = mkBars([
		[100, 101, 99, 100], // 0 fresh LONG (signal A)
		[100, 105, 98, 102], // 1 enter A @100
		[104, 125, 110, 120], // 2 target A @120  (+20%)
		[100, 101, 99, 100], // 3 fresh LONG (signal B)
		[100, 104, 96, 98], // 4 enter B @100
		[92, 95, 85, 90], // 5 stop B @90  (-10%)
		[100, 101, 99, 100], // 6 fresh LONG (signal C)
		[100, 103, 98, 100], // 7 enter C @100
		[100, 104, 97, 105], // 8 hold
		[108, 112, 104, 110] // 9 maxHold C @110 (+10%)
	]);
	const series: (IndicatorRow | null)[] = new Array(bars.length).fill(null);
	const signals = [freshLong(0, bars), freshLong(3, bars), freshLong(6, bars)];

	const cfg: BacktestConfig = {
		...DEFAULT_BACKTEST_CONFIG,
		exit: {
			stopLossPct: 0.1,
			takeProfit: { type: 'R', value: 2 },
			maxHoldBars: 2,
			exitOnOppositeSignal: false,
			exitOnStackBreak: false
		},
		initialEquity: 10_000,
		positionSizePct: 1,
		feesPct: 0,
		slippagePct: 0
	};

	const result = runBacktestWithSignals(bars, signals, series, cfg, 'TEST');

	it('produces exactly three trades exiting three different ways', () => {
		expect(result.trades).toHaveLength(3);
		expect(result.trades.map((t) => t.exitReason)).toEqual(['target', 'stop', 'maxHold']);
	});

	it('enters at the next bar open (no look-ahead)', () => {
		expect(result.trades[0]?.entryIndex).toBe(1);
		expect(result.trades[0]?.entryPrice).toBeCloseTo(100, 10);
		expect(result.trades[0]?.exitIndex).toBe(2);
		expect(result.trades[0]?.exitPrice).toBeCloseTo(120, 10);
	});

	it('computes per-trade returns and R-multiples', () => {
		expect(result.trades.map((t) => t.pnlPct)).toEqual([
			expect.closeTo(0.2, 6),
			expect.closeTo(-0.1, 6),
			expect.closeTo(0.1, 6)
		]);
		expect(result.trades.map((t) => t.rMultiple)).toEqual([
			expect.closeTo(2, 6),
			expect.closeTo(-1, 6),
			expect.closeTo(1, 6)
		]);
	});

	it('compounds equity correctly (10000 → 11880)', () => {
		expect(result.metrics.finalEquity).toBeCloseTo(11_880, 4);
		expect(result.equityCurve).toHaveLength(10);
	});

	it('derives aggregate metrics that match hand calculation', () => {
		const m = result.metrics;
		expect(m.winRate).toBeCloseTo(2 / 3, 6);
		expect(m.profitFactor).toBeCloseTo(3, 6); // (0.2 + 0.1) / 0.1
		expect(m.maxDrawdown).toBeCloseTo(-0.1, 6); // 10800 / 12000 - 1
		expect(m.exposure).toBeCloseTo(0.7, 6); // 7 bars in market / 10
		expect(m.totalReturnPct).toBeCloseTo(0.188, 6);
	});
});

describe('runBacktest — end-to-end smoke over a generated series', () => {
	it('runs without error and returns a full equity curve', () => {
		const n = 300;
		const bars: Bar[] = Array.from({ length: n }, (_, i) => {
			const close = 100 + i * 0.5 + Math.sin(i / 5) * 2;
			return {
				date: `2027-01-01`,
				open: close - 0.2,
				high: close + 1,
				low: close - 1,
				close,
				adjClose: close,
				volume: 1000
			};
		});
		const series = computeIndicatorSeries(bars);
		const result = runBacktest(bars, series, DEFAULT_BACKTEST_CONFIG, 'GEN');
		expect(result.equityCurve).toHaveLength(n);
		expect(Array.isArray(result.trades)).toBe(true);
		expect(Number.isFinite(result.metrics.finalEquity)).toBe(true);
	});
});
