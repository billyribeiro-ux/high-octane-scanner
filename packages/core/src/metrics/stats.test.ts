import { describe, expect, it } from 'vitest';
import {
	cagr,
	expectancy,
	maxDrawdown,
	mean,
	periodReturns,
	profitFactor,
	sharpe,
	sortino,
	stddev
} from './stats.js';

describe('basic stats', () => {
	it('mean and sample stddev', () => {
		expect(mean([1, 2, 3, 4])).toBeCloseTo(2.5, 10);
		expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
		expect(stddev([5])).toBe(0);
	});
});

describe('maxDrawdown', () => {
	it('finds the worst peak-to-trough decline', () => {
		// peak 120 → trough 108 ⇒ -10%
		expect(maxDrawdown([100, 120, 108, 132])).toBeCloseTo(-0.1, 10);
	});
	it('is zero for a monotonically rising curve', () => {
		expect(maxDrawdown([100, 110, 120])).toBe(0);
	});
});

describe('trade aggregates', () => {
	const rets = [0.2, -0.1, 0.1];
	it('profitFactor = gross profit / gross loss', () => {
		expect(profitFactor(rets)).toBeCloseTo(3, 10); // 0.3 / 0.1
	});
	it('expectancy = average trade return', () => {
		expect(expectancy(rets)).toBeCloseTo(0.2 / 3, 10);
	});
	it('profitFactor is Infinity with no losses', () => {
		expect(profitFactor([0.1, 0.2])).toBe(Infinity);
	});
});

describe('periodReturns', () => {
	it('computes successive simple returns', () => {
		expect(periodReturns([100, 110, 99])).toEqual([
			expect.closeTo(0.1, 10),
			expect.closeTo(-0.1, 10)
		]);
	});
});

describe('risk-adjusted ratios', () => {
	it('sharpe is 0 for fewer than two returns or zero variance', () => {
		expect(sharpe([0.01])).toBe(0);
		expect(sharpe([0.01, 0.01, 0.01])).toBe(0);
	});
	it('sharpe matches a hand calculation (periodsPerYear = 1)', () => {
		const r = [0.01, 0.02, -0.01, 0.03];
		// mean 0.0125, sample sd ≈ 0.017078 ⇒ ratio ≈ 0.732
		expect(sharpe(r, 0, 1)).toBeCloseTo(0.732, 3);
	});
	it('sortino only penalises downside and is positive for mostly-up returns', () => {
		const r = [0.02, -0.01, 0.03, 0.01];
		expect(sortino(r, 0, 1)).toBeGreaterThan(0);
	});
});

describe('cagr', () => {
	it('annualises total growth over the bar span', () => {
		// 252 bars ≈ 1 year ⇒ CAGR ≈ total return
		expect(cagr(10_000, 11_880, 252, 252)).toBeCloseTo(0.188, 4);
	});
	it('is zero for non-positive inputs', () => {
		expect(cagr(0, 100, 252)).toBe(0);
	});
});
