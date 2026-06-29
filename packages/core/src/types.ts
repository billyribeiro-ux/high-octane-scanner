// Core domain types for the trading engine. Pure data — no IO, no framework.

/** A single OHLCV price bar. `date` is an ISO `YYYY-MM-DD` string. */
export interface Bar {
	date: string;
	open: number;
	high: number;
	low: number;
	close: number;
	/** Adjusted close (splits/dividends). Falls back to `close` when unavailable. */
	adjClose: number;
	volume: number;
}

/** The six moving averages used by the strategy, evaluated at one bar. */
export interface IndicatorRow {
	ema5: number;
	ema9: number;
	ema21: number;
	sma50: number;
	sma100: number;
	sma200: number;
}

export type Direction = 'LONG' | 'SHORT';

/** Which price field signals are computed from. */
export type PriceSource = 'close' | 'adjClose';

export interface SignalConfig {
	/** Swap LONG/SHORT labels (the strategy is a mean-reversion/exhaustion read). */
	invert: boolean;
	/** Number of consecutive closes that must be above/below EMA5 (strategy = 5). */
	closesRequired: number;
	/** Price field used for the close-vs-EMA5 comparison and signal close. */
	source: PriceSource;
}

export interface Signal {
	date: string;
	/** Index of the bar in the series this signal belongs to. */
	index: number;
	direction: Direction;
	/** Closing price (per `SignalConfig.source`) at the signal bar. */
	close: number;
	/** True when this is the first bar of a new signal run (a genuine event). */
	fresh: boolean;
	indicators: IndicatorRow;
}

/** Take-profit specified either as an R-multiple of risk or a flat percent. */
export type TakeProfit = { type: 'R'; value: number } | { type: 'PCT'; value: number };

/** Configurable exit rules. Any combination may be enabled. */
export interface ExitModel {
	/** Stop loss as a fraction of entry price, e.g. 0.05 = 5% adverse move. */
	stopLossPct?: number;
	/** Take profit. `R` requires `stopLossPct` to define the risk unit. */
	takeProfit?: TakeProfit;
	/** Exit after this many bars held. */
	maxHoldBars?: number;
	/** Exit when an opposite fresh signal fires. */
	exitOnOppositeSignal?: boolean;
	/** Exit when the MA stack that triggered the entry no longer holds. */
	exitOnStackBreak?: boolean;
}

export interface BacktestConfig {
	signal: SignalConfig;
	exit: ExitModel;
	/** Starting account equity (currency). */
	initialEquity: number;
	/** Fraction of current equity committed per trade (1 = all-in). */
	positionSizePct: number;
	/** Per-side commission as a fraction of notional, e.g. 0.0005 = 5 bps. */
	feesPct: number;
	/** Per-side slippage as a fraction of fill price. */
	slippagePct: number;
	/** Annual risk-free rate used for Sharpe/Sortino. */
	riskFreeRate: number;
}

export type ExitReason = 'stop' | 'target' | 'maxHold' | 'opposite' | 'stackBreak' | 'endOfData';

export interface Trade {
	symbol: string;
	direction: Direction;
	entryDate: string;
	entryIndex: number;
	entryPrice: number;
	exitDate: string;
	exitIndex: number;
	exitPrice: number;
	exitReason: ExitReason;
	barsHeld: number;
	/** Currency profit/loss for the position. */
	pnl: number;
	/** Trade return on committed notional (signed by direction, net of costs). */
	pnlPct: number;
	/** Profit/loss expressed in units of initial risk (needs `stopLossPct`). */
	rMultiple: number;
}

export interface EquityPoint {
	date: string;
	equity: number;
	/** (equity / running peak) - 1; always <= 0. */
	drawdown: number;
}

export interface Metrics {
	totalTrades: number;
	wins: number;
	losses: number;
	winRate: number;
	/** Average return of winning trades (>= 0). */
	avgWin: number;
	/** Average return of losing trades (<= 0). */
	avgLoss: number;
	avgReturn: number;
	/** Gross profit / gross loss. */
	profitFactor: number;
	/** Average return per trade. */
	expectancy: number;
	/** Most negative drawdown over the equity curve (<= 0). */
	maxDrawdown: number;
	sharpe: number;
	sortino: number;
	/** Compound annual growth rate. */
	cagr: number;
	/** Fraction of bars spent in the market. */
	exposure: number;
	totalReturnPct: number;
	finalEquity: number;
}

export interface BacktestResult {
	symbol: string;
	trades: Trade[];
	equityCurve: EquityPoint[];
	metrics: Metrics;
}

export const DEFAULT_SIGNAL_CONFIG: SignalConfig = {
	invert: false,
	closesRequired: 5,
	source: 'close'
};

export const DEFAULT_EXIT_MODEL: ExitModel = {
	stopLossPct: 0.08,
	takeProfit: { type: 'R', value: 2 },
	maxHoldBars: 20,
	exitOnOppositeSignal: true,
	exitOnStackBreak: true
};

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
	signal: DEFAULT_SIGNAL_CONFIG,
	exit: DEFAULT_EXIT_MODEL,
	initialEquity: 10_000,
	positionSizePct: 1,
	feesPct: 0,
	slippagePct: 0,
	riskFreeRate: 0
};
