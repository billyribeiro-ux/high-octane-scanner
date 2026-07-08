import type { EquityPoint, Metrics, Trade } from '../types.js';
import {
	cagr,
	expectancy,
	maxDrawdown,
	mean,
	periodReturns,
	profitFactor,
	sharpe,
	sortino
} from './stats.js';

export interface MetricsOptions {
	initialEquity: number;
	riskFreeRate?: number;
	periodsPerYear?: number;
	/** Total bars in the tested series (for exposure). Defaults to curve length. */
	totalBars?: number;
}

const EMPTY_METRICS = (initialEquity: number, finalEquity: number): Metrics => ({
	totalTrades: 0,
	wins: 0,
	losses: 0,
	winRate: 0,
	avgWin: 0,
	avgLoss: 0,
	avgReturn: 0,
	profitFactor: 0,
	expectancy: 0,
	maxDrawdown: 0,
	sharpe: 0,
	sortino: 0,
	cagr: 0,
	exposure: 0,
	totalReturnPct: finalEquity / initialEquity - 1,
	finalEquity
});

/** Summarise trades + equity curve into aggregate performance metrics. */
export function computeMetrics(
	trades: Trade[],
	equityCurve: EquityPoint[],
	opts: MetricsOptions
): Metrics {
	const periodsPerYear = opts.periodsPerYear ?? 252;
	const equity = equityCurve.map((p) => p.equity);
	const finalEquity = equity.length > 0 ? (equity[equity.length - 1] as number) : opts.initialEquity;

	if (trades.length === 0) return EMPTY_METRICS(opts.initialEquity, finalEquity);

	const returns = trades.map((t) => t.pnlPct);
	const winning = returns.filter((r) => r > 0);
	const losing = returns.filter((r) => r <= 0);

	const totalBars = opts.totalBars ?? equityCurve.length;
	const barsInMarket = trades.reduce((acc, t) => acc + t.barsHeld + 1, 0);

	return {
		totalTrades: trades.length,
		wins: winning.length,
		losses: losing.length,
		winRate: winning.length / trades.length,
		avgWin: winning.length > 0 ? mean(winning) : 0,
		avgLoss: losing.length > 0 ? mean(losing) : 0,
		avgReturn: mean(returns),
		profitFactor: profitFactor(returns),
		expectancy: expectancy(returns),
		maxDrawdown: maxDrawdown(equity),
		sharpe: sharpe(periodReturns(equity), opts.riskFreeRate ?? 0, periodsPerYear),
		sortino: sortino(periodReturns(equity), opts.riskFreeRate ?? 0, periodsPerYear),
		cagr: cagr(opts.initialEquity, finalEquity, Math.max(1, totalBars - 1), periodsPerYear),
		exposure: totalBars > 0 ? Math.min(1, barsInMarket / totalBars) : 0,
		totalReturnPct: finalEquity / opts.initialEquity - 1,
		finalEquity
	};
}
