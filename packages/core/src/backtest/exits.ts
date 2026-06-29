import type { Bar, Direction, ExitModel, ExitReason } from '../types.js';

/** The minimal position shape {@link evaluateExit} needs to decide an exit. */
export interface ExitablePosition {
	/** +1 for LONG, -1 for SHORT. */
	sign: 1 | -1;
	stop?: number;
	target?: number;
}

export interface OpenPosition extends ExitablePosition {
	direction: Direction;
	entryIndex: number;
	entryDate: string;
	entryPrice: number;
	/** Account equity at the moment of entry (after entry costs). */
	entryEquity: number;
	/** Price the open position was last marked to (for incremental MTM). */
	lastMark: number;
}

/** Stop/target price levels for a new position. */
export function computeLevels(
	entryPrice: number,
	sign: 1 | -1,
	exit: ExitModel
): { stop?: number; target?: number } {
	const levels: { stop?: number; target?: number } = {};
	if (exit.stopLossPct !== undefined) {
		levels.stop = entryPrice * (1 - sign * exit.stopLossPct);
	}
	if (exit.takeProfit !== undefined) {
		if (exit.takeProfit.type === 'PCT') {
			levels.target = entryPrice * (1 + sign * exit.takeProfit.value);
		} else if (exit.stopLossPct !== undefined) {
			// R-multiple of the stop distance.
			levels.target = entryPrice * (1 + sign * exit.takeProfit.value * exit.stopLossPct);
		}
	}
	return levels;
}

export interface ExitFlags {
	/** A fresh opposite-direction signal fired on this bar. */
	oppositeFreshSignal: boolean;
	/** The entry-direction MA stack no longer holds on this bar. */
	stackBroken: boolean;
}

export interface ExitDecision {
	/** Pre-slippage exit price. */
	price: number;
	reason: ExitReason;
}

/**
 * Decide whether an open position exits on the given bar. Price-level exits
 * (stop/target) are checked intrabar against high/low and take priority; when
 * both could fill in the same bar the stop is assumed first (conservative).
 * Signal-driven exits fill at the bar close.
 */
export function evaluateExit(
	pos: ExitablePosition,
	bar: Bar,
	barsHeld: number,
	isLastBar: boolean,
	flags: ExitFlags,
	exit: ExitModel
): ExitDecision | null {
	// 1. Stop loss (intrabar).
	if (pos.stop !== undefined) {
		if (pos.sign === 1 && bar.low <= pos.stop) return { price: pos.stop, reason: 'stop' };
		if (pos.sign === -1 && bar.high >= pos.stop) return { price: pos.stop, reason: 'stop' };
	}
	// 2. Take profit (intrabar).
	if (pos.target !== undefined) {
		if (pos.sign === 1 && bar.high >= pos.target) return { price: pos.target, reason: 'target' };
		if (pos.sign === -1 && bar.low <= pos.target) return { price: pos.target, reason: 'target' };
	}
	// 3. Opposite signal (at close).
	if (exit.exitOnOppositeSignal && flags.oppositeFreshSignal) {
		return { price: bar.close, reason: 'opposite' };
	}
	// 4. Stack break (at close).
	if (exit.exitOnStackBreak && flags.stackBroken) {
		return { price: bar.close, reason: 'stackBreak' };
	}
	// 5. Max hold (at close).
	if (exit.maxHoldBars !== undefined && barsHeld >= exit.maxHoldBars) {
		return { price: bar.close, reason: 'maxHold' };
	}
	// 6. End of data — force flat at the last bar's close.
	if (isLastBar) return { price: bar.close, reason: 'endOfData' };

	return null;
}
