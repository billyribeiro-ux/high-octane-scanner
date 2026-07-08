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
import { computeLevels, evaluateExit } from './exits.js';

export interface SymbolSeries {
	symbol: string;
	bars: Bar[];
	series: (IndicatorRow | null)[];
	/** Optional precomputed signals; detected from the series when omitted. */
	signals?: Signal[];
}

type StackType = 'bull' | 'bear';

interface PortfolioPosition {
	symbol: string;
	direction: Direction;
	sign: 1 | -1;
	entryIdx: number;
	entryDate: string;
	entryPrice: number;
	stop?: number;
	target?: number;
	/** Capital committed to this position (fixed notional bucket). */
	alloc: number;
	posStack: StackType | null;
}

interface SymbolState {
	symbol: string;
	bars: Bar[];
	series: (IndicatorRow | null)[];
	dateToIndex: Map<string, number>;
	freshDir: (Direction | null)[];
	/** entryDate -> intent (entry fills at that bar's open). */
	intents: Map<string, { direction: Direction; stack: StackType | null }>;
}

function stackTypeAt(row: IndicatorRow | null): StackType | null {
	if (!row) return null;
	if (isBullishStack(row)) return 'bull';
	if (isBearishStack(row)) return 'bear';
	return null;
}

function posValue(pos: PortfolioPosition, price: number): number {
	return pos.alloc * (1 + pos.sign * ((price - pos.entryPrice) / pos.entryPrice));
}

/**
 * Universe-wide backtest with shared capital. Each position is a fixed-notional
 * bucket sized at `positionSizePct` of equity at entry; concurrency is bounded
 * by available cash (and `maxPositions`). Entries fill at the next bar's open.
 */
export function runPortfolioBacktest(
	inputs: SymbolSeries[],
	cfg: BacktestConfig = DEFAULT_BACKTEST_CONFIG,
	opts: { maxPositions?: number } = {}
): BacktestResult {
	const maxPositions = opts.maxPositions ?? Math.max(1, Math.floor(1 / cfg.positionSizePct));
	const { exit } = cfg;

	// Build per-symbol state and the global date axis.
	const states: SymbolState[] = inputs.map((inp) => {
		const signals = inp.signals ?? detectSignalsForSeries(inp.bars, inp.series, cfg.signal);
		const freshDir: (Direction | null)[] = new Array(inp.bars.length).fill(null);
		for (const s of signals) if (s.fresh) freshDir[s.index] = s.direction;

		const dateToIndex = new Map<string, number>();
		inp.bars.forEach((b, i) => dateToIndex.set(b.date, i));

		const intents = new Map<string, { direction: Direction; stack: StackType | null }>();
		for (let i = 0; i < inp.bars.length; i++) {
			const dir = freshDir[i];
			const entryBar = inp.bars[i + 1];
			if (dir && entryBar && !intents.has(entryBar.date)) {
				intents.set(entryBar.date, { direction: dir, stack: stackTypeAt(inp.series[i] ?? null) });
			}
		}
		return { symbol: inp.symbol, bars: inp.bars, series: inp.series, dateToIndex, freshDir, intents };
	});

	const allDates = [...new Set(inputs.flatMap((i) => i.bars.map((b) => b.date)))].sort();

	const lastPrice = new Map<string, number>();
	const open = new Map<string, PortfolioPosition>();
	const trades: Trade[] = [];
	const equityCurve: EquityPoint[] = [];
	let freeCash = cfg.initialEquity;
	let peak = cfg.initialEquity;

	const totalEquity = (): number => {
		let eq = freeCash;
		for (const pos of open.values()) {
			eq += posValue(pos, lastPrice.get(pos.symbol) ?? pos.entryPrice);
		}
		return eq;
	};

	for (const date of allDates) {
		// Refresh last-known prices for symbols trading today.
		for (const st of states) {
			const idx = st.dateToIndex.get(date);
			if (idx !== undefined) lastPrice.set(st.symbol, (st.bars[idx] as Bar).close);
		}

		// 1. Exits for open positions whose symbol trades today.
		for (const st of states) {
			const pos = open.get(st.symbol);
			if (!pos) continue;
			const idx = st.dateToIndex.get(date);
			if (idx === undefined) continue;
			const bar = st.bars[idx] as Bar;
			const barsHeld = idx - pos.entryIdx;
			const isLast = idx === st.bars.length - 1;
			const fd = st.freshDir[idx];
			const oppositeFreshSignal = fd != null && fd !== pos.direction;
			const stackBroken =
				!!exit.exitOnStackBreak &&
				pos.posStack != null &&
				stackTypeAt(st.series[idx] ?? null) !== pos.posStack;

			const decision = evaluateExit(
				pos,
				bar,
				barsHeld,
				isLast,
				{ oppositeFreshSignal, stackBroken },
				exit
			);
			if (!decision) continue;

			const exitPrice = decision.price * (1 - pos.sign * cfg.slippagePct);
			const grossRet = pos.sign * ((exitPrice - pos.entryPrice) / pos.entryPrice);
			const pnlPct = grossRet - 2 * cfg.feesPct;
			const pnl = pos.alloc * pnlPct;
			freeCash += pos.alloc + pnl;
			const risk = exit.stopLossPct;
			trades.push({
				symbol: st.symbol,
				direction: pos.direction,
				entryDate: pos.entryDate,
				entryIndex: pos.entryIdx,
				entryPrice: pos.entryPrice,
				exitDate: date,
				exitIndex: idx,
				exitPrice,
				exitReason: decision.reason,
				barsHeld,
				pnl,
				pnlPct,
				rMultiple: risk && risk > 0 ? grossRet / risk : 0,
				maePct: 0,
				mfePct: 0
			});
			open.delete(st.symbol);
		}

		// 2. Entries (sized off current equity), bounded by cash and maxPositions.
		const equityNow = totalEquity();
		for (const st of states) {
			if (open.size >= maxPositions) break;
			if (open.has(st.symbol)) continue;
			const idx = st.dateToIndex.get(date);
			if (idx === undefined) continue;
			const intent = st.intents.get(date);
			if (!intent) continue;
			const alloc = equityNow * cfg.positionSizePct;
			if (alloc <= 0 || freeCash < alloc) continue;

			const sign: 1 | -1 = intent.direction === 'LONG' ? 1 : -1;
			const entryPrice = (st.bars[idx] as Bar).open * (1 + sign * cfg.slippagePct);
			const { stop, target } = computeLevels(entryPrice, sign, exit);
			freeCash -= alloc + alloc * cfg.feesPct; // commit capital + entry commission
			open.set(st.symbol, {
				symbol: st.symbol,
				direction: intent.direction,
				sign,
				entryIdx: idx,
				entryDate: date,
				entryPrice,
				stop,
				target,
				alloc,
				posStack: intent.stack
			});
		}

		// 3. Record equity point (mark to today's prices).
		const eq = totalEquity();
		if (eq > peak) peak = eq;
		equityCurve.push({ date, equity: eq, drawdown: peak > 0 ? eq / peak - 1 : 0 });
	}

	const metrics = computeMetrics(trades, equityCurve, {
		initialEquity: cfg.initialEquity,
		riskFreeRate: cfg.riskFreeRate,
		totalBars: allDates.length
	});

	return { symbol: '(portfolio)', trades, equityCurve, metrics };
}
