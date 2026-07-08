// Pure statistical helpers used to summarise a backtest.

export function mean(xs: number[]): number {
	if (xs.length === 0) return 0;
	let s = 0;
	for (const x of xs) s += x;
	return s / xs.length;
}

/** Sample standard deviation (n - 1). Returns 0 for fewer than 2 samples. */
export function stddev(xs: number[]): number {
	if (xs.length < 2) return 0;
	const m = mean(xs);
	let acc = 0;
	for (const x of xs) acc += (x - m) ** 2;
	return Math.sqrt(acc / (xs.length - 1));
}

/** Most negative drawdown of an equity series, as a fraction (<= 0). */
export function maxDrawdown(equity: number[]): number {
	let peak = -Infinity;
	let maxDd = 0;
	for (const e of equity) {
		if (e > peak) peak = e;
		if (peak > 0) {
			const dd = e / peak - 1;
			if (dd < maxDd) maxDd = dd;
		}
	}
	return maxDd;
}

/** Per-period simple returns from an equity series. */
export function periodReturns(equity: number[]): number[] {
	const out: number[] = [];
	for (let i = 1; i < equity.length; i++) {
		const prev = equity[i - 1] as number;
		const cur = equity[i] as number;
		if (prev !== 0) out.push(cur / prev - 1);
	}
	return out;
}

/**
 * Annualised Sharpe ratio from per-period returns. `riskFreeRate` is annual and
 * is converted to a per-period rate via `periodsPerYear`.
 */
export function sharpe(returns: number[], riskFreeRate = 0, periodsPerYear = 252): number {
	if (returns.length < 2) return 0;
	const rfPer = riskFreeRate / periodsPerYear;
	const excess = returns.map((r) => r - rfPer);
	const sd = stddev(excess);
	if (sd === 0) return 0;
	return (mean(excess) / sd) * Math.sqrt(periodsPerYear);
}

/** Annualised Sortino ratio (downside deviation only). */
export function sortino(returns: number[], riskFreeRate = 0, periodsPerYear = 252): number {
	if (returns.length < 2) return 0;
	const rfPer = riskFreeRate / periodsPerYear;
	const excess = returns.map((r) => r - rfPer);
	let acc = 0;
	let count = 0;
	for (const e of excess) {
		if (e < 0) {
			acc += e * e;
			count += 1;
		}
	}
	if (count === 0) return 0;
	const downside = Math.sqrt(acc / count);
	if (downside === 0) return 0;
	return (mean(excess) / downside) * Math.sqrt(periodsPerYear);
}

/**
 * Compound annual growth rate. `bars` is the number of periods spanned;
 * `periodsPerYear` converts it to years.
 */
export function cagr(
	initialEquity: number,
	finalEquity: number,
	bars: number,
	periodsPerYear = 252
): number {
	if (initialEquity <= 0 || finalEquity <= 0 || bars <= 0) return 0;
	const years = bars / periodsPerYear;
	if (years <= 0) return 0;
	return (finalEquity / initialEquity) ** (1 / years) - 1;
}

/** Gross profit / gross loss across trade returns. */
export function profitFactor(tradeReturns: number[]): number {
	let gp = 0;
	let gl = 0;
	for (const r of tradeReturns) {
		if (r > 0) gp += r;
		else gl += -r;
	}
	if (gl === 0) return gp > 0 ? Infinity : 0;
	return gp / gl;
}

/** Average return per trade. */
export function expectancy(tradeReturns: number[]): number {
	return mean(tradeReturns);
}
