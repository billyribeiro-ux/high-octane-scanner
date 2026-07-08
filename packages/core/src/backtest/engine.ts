import type {
	BacktestConfig,
	BacktestResult,
	Bar,
	Direction,
	EquityPoint,
	IndicatorRow,
	Signal,
	Trade
} from '../types.js';
import { DEFAULT_BACKTEST_CONFIG } from '../types.js';
import { detectSignalsForSeries } from '../signals/detect.js';
import { isBearishStack, isBullishStack } from '../signals/stack.js';
import { computeMetrics } from '../metrics/metrics.js';
import {
	computeLevels,
	evaluateExit,
	updateExcursions,
	type ExcursionState,
	type OpenPosition
} from './exits.js';

type StackType = 'bull' | 'bear';

interface PendingEntry {
	direction: Direction;
	stack: StackType | null;
}

function stackTypeAt(row: IndicatorRow | null): StackType | null {
	if (!row) return null;
	if (isBullishStack(row)) return 'bull';
	if (isBearishStack(row)) return 'bear';
	return null;
}

/**
 * Simulate trades from a precomputed signal list. Entries fill at the **next**
 * bar's open (no look-ahead); one position at a time. Equity is marked to market
 * each bar and compounds. Exposed separately from {@link runBacktest} so the
 * exit logic can be unit-tested with hand-built signals.
 */
export function runBacktestWithSignals(
	bars: Bar[],
	signals: Signal[],
	series: (IndicatorRow | null)[],
	cfg: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
	symbol = ''
): BacktestResult {
	const n = bars.length;
	const f = cfg.positionSizePct;
	const { exit } = cfg;

	// Fresh signal direction per bar — drives entries and opposite-signal exits.
	const freshDir: (Direction | null)[] = new Array(n).fill(null);
	for (const s of signals) {
		if (s.fresh && s.index >= 0 && s.index < n) freshDir[s.index] = s.direction;
	}

	const applyFill = (price: number, sign: 1 | -1, side: 'enter' | 'exit'): number => {
		const slip = cfg.slippagePct;
		// Slippage always works against us.
		return side === 'enter' ? price * (1 + sign * slip) : price * (1 - sign * slip);
	};

	const trades: Trade[] = [];
	const equityCurve: EquityPoint[] = [];
	let equity = cfg.initialEquity;
	let peak = equity;
	let pos: OpenPosition | null = null;
	let posStack: StackType | null = null;
	let posExcursions: ExcursionState = { mae: 0, mfe: 0 };
	let pending: PendingEntry | null = null;

	for (let i = 0; i < n; i++) {
		const bar = bars[i] as Bar;

		// 1. Execute a pending entry at this bar's open.
		if (!pos && pending) {
			const sign: 1 | -1 = pending.direction === 'LONG' ? 1 : -1;
			const entryPrice = applyFill(bar.open, sign, 'enter');
			const { stop, target } = computeLevels(entryPrice, sign, exit);
			equity -= equity * f * cfg.feesPct; // entry commission
			pos = {
				direction: pending.direction,
				sign,
				entryIndex: i,
				entryDate: bar.date,
				entryPrice,
				stop,
				target,
				entryEquity: equity,
				lastMark: entryPrice
			};
			posStack = pending.stack;
			posExcursions = { mae: 0, mfe: 0 };
			pending = null;
		}

		// 2. Manage an open position.
		if (pos) {
			updateExcursions(posExcursions, pos.sign, pos.entryPrice, bar);
			const barsHeld = i - pos.entryIndex;
			const isLast = i === n - 1;
			const fd = freshDir[i];
			const oppositeFreshSignal = fd != null && fd !== pos.direction;
			const stackNow = stackTypeAt(series[i] ?? null);
			const stackBroken = !!exit.exitOnStackBreak && posStack != null && stackNow !== posStack;

			const decision = evaluateExit(
				pos,
				bar,
				barsHeld,
				isLast,
				{ oppositeFreshSignal, stackBroken },
				exit
			);

			if (decision) {
				const exitPrice = applyFill(decision.price, pos.sign, 'exit');
				equity *= 1 + pos.sign * f * ((exitPrice - pos.lastMark) / pos.lastMark);
				equity -= equity * f * cfg.feesPct; // exit commission

				const grossRet = pos.sign * ((exitPrice - pos.entryPrice) / pos.entryPrice);
				const pnlPct = grossRet - 2 * cfg.feesPct;
				const pnl = pos.entryEquity * f * pnlPct;
				const risk = exit.stopLossPct;
				const rMultiple = risk && risk > 0 ? grossRet / risk : 0;

				trades.push({
					symbol,
					direction: pos.direction,
					entryDate: pos.entryDate,
					entryIndex: pos.entryIndex,
					entryPrice: pos.entryPrice,
					exitDate: bar.date,
					exitIndex: i,
					exitPrice,
					exitReason: decision.reason,
					barsHeld,
					pnl,
					pnlPct,
					rMultiple,
					maePct: posExcursions.mae,
					mfePct: posExcursions.mfe
				});
				pos = null;
				posStack = null;
			} else {
				equity *= 1 + pos.sign * f * ((bar.close - pos.lastMark) / pos.lastMark);
				pos.lastMark = bar.close;
			}
		}

		// 3. Arm a pending entry from a fresh signal when flat.
		if (!pos && !pending) {
			const fd = freshDir[i];
			if (fd) {
				const stack = exit.exitOnStackBreak ? stackTypeAt(series[i] ?? null) : null;
				pending = { direction: fd, stack };
			}
		}

		// 4. Record the equity point.
		if (equity > peak) peak = equity;
		equityCurve.push({ date: bar.date, equity, drawdown: peak > 0 ? equity / peak - 1 : 0 });
	}

	const metrics = computeMetrics(trades, equityCurve, {
		initialEquity: cfg.initialEquity,
		riskFreeRate: cfg.riskFreeRate,
		totalBars: n
	});

	return { symbol, trades, equityCurve, metrics };
}

/** Detect signals from the indicator series, then backtest them. */
export function runBacktest(
	bars: Bar[],
	series: (IndicatorRow | null)[],
	cfg: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
	symbol = ''
): BacktestResult {
	const signals = detectSignalsForSeries(bars, series, cfg.signal);
	return runBacktestWithSignals(bars, signals, series, cfg, symbol);
}
