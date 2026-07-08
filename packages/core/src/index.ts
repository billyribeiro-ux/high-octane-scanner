// @scanner/core — pure, dependency-free trading engine.
// Shared by the SvelteKit server and the standalone worker.

export const CORE_VERSION = '0.1.0';

export * from './types.js';

// Indicators
export { ema, EmaState } from './indicators/ema.js';
export { sma, SmaState } from './indicators/sma.js';
export { computeIndicatorSeries, MA_PERIODS, MIN_BARS } from './indicators/indicators.js';

// Signals
export { isBullishStack, isBearishStack } from './signals/stack.js';
export { detectSignalsForSeries, latestSignal } from './signals/detect.js';

// Backtest
export { runBacktest, runBacktestWithSignals } from './backtest/engine.js';
export { runPortfolioBacktest, type SymbolSeries } from './backtest/portfolio.js';
export {
	computeLevels,
	evaluateExit,
	updateExcursions,
	type ExcursionState,
	type OpenPosition
} from './backtest/exits.js';

// Metrics
export { computeMetrics, type MetricsOptions } from './metrics/metrics.js';
export {
	mean,
	stddev,
	maxDrawdown,
	periodReturns,
	sharpe,
	sortino,
	cagr,
	profitFactor,
	expectancy
} from './metrics/stats.js';
