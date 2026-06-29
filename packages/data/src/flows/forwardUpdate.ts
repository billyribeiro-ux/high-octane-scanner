import { DEFAULT_EXIT_MODEL, type ExitModel } from '@scanner/core';
import type { FmpClient } from '../fmp/client.js';
import { batchQuotes } from '../fmp/endpoints.js';
import * as signalsRepo from '../repositories/signals.repo.js';
import * as forwardRepo from '../repositories/forward.repo.js';

function targetPnl(exit: ExitModel): number | null {
	if (!exit.takeProfit) return null;
	if (exit.takeProfit.type === 'PCT') return exit.takeProfit.value;
	if (exit.stopLossPct != null) return exit.takeProfit.value * exit.stopLossPct;
	return null;
}

function daysBetween(from: string, to: string): number {
	const a = Date.parse(`${from}T00:00:00Z`);
	const b = Date.parse(`${to}T00:00:00Z`);
	return Math.round((b - a) / 86_400_000);
}

export interface ForwardUpdateOptions {
	today?: string;
	exit?: ExitModel;
}

/**
 * Forward-test tracker: open new positions from the latest fresh signals, then
 * mark every open position to its current quote and apply close-based exit rules
 * (stop / target / max-hold). Approximate by design — entries use the signal
 * close and max-hold counts calendar days.
 */
export async function forwardUpdate(
	client: FmpClient,
	opts: ForwardUpdateOptions = {}
): Promise<{ opened: number; updated: number; closed: number }> {
	const exit = opts.exit ?? DEFAULT_EXIT_MODEL;
	const today = opts.today ?? new Date().toISOString().slice(0, 10);

	// 1. Open positions from the latest scan's fresh signals.
	const latest = await signalsRepo.latest({ freshOnly: true, limit: 5000 });
	const existing = await forwardRepo.listOpenPositions();
	const openKeys = new Set(existing.map((p) => `${p.symbol}|${p.direction}`));

	const toOpen: forwardRepo.ForwardPosition[] = [];
	for (const s of latest.rows) {
		const key = `${s.symbol}|${s.direction}`;
		if (openKeys.has(key)) continue;
		openKeys.add(key);
		toOpen.push({
			symbol: s.symbol,
			entryDate: s.signalDate,
			direction: s.direction,
			entryPrice: s.close,
			currentDate: s.signalDate,
			currentPrice: s.close,
			exitDate: null,
			exitPrice: null,
			exitReason: null,
			pnlPct: 0,
			status: 'OPEN',
			configJson: JSON.stringify(exit)
		});
	}
	if (toOpen.length > 0) await forwardRepo.upsertPositions(toOpen);

	// 2. Mark open positions to current quotes and evaluate exits.
	const open = await forwardRepo.listOpenPositions();
	const symbols = [...new Set(open.map((p) => p.symbol))];
	const quotes = symbols.length > 0 ? await batchQuotes(client, symbols) : [];
	const priceBy = new Map(quotes.map((q) => [q.symbol, q.price ?? null]));

	const tp = targetPnl(exit);
	const updates: forwardRepo.ForwardPosition[] = [];
	let closed = 0;
	let updated = 0;

	for (const p of open) {
		const price = priceBy.get(p.symbol);
		if (price == null) continue;
		const sign = p.direction === 'LONG' ? 1 : -1;
		const pnlPct = sign * ((price - p.entryPrice) / p.entryPrice);

		let reason: string | null = null;
		if (exit.stopLossPct != null && pnlPct <= -exit.stopLossPct) reason = 'stop';
		else if (tp != null && pnlPct >= tp) reason = 'target';
		else if (exit.maxHoldBars != null && daysBetween(p.entryDate, today) >= exit.maxHoldBars)
			reason = 'maxHold';

		const rec: forwardRepo.ForwardPosition = {
			...p,
			currentDate: today,
			currentPrice: price,
			pnlPct
		};
		if (reason) {
			rec.status = 'CLOSED';
			rec.exitDate = today;
			rec.exitPrice = price;
			rec.exitReason = reason;
			closed += 1;
		} else {
			updated += 1;
		}
		updates.push(rec);
	}
	if (updates.length > 0) await forwardRepo.upsertPositions(updates);

	return { opened: toOpen.length, updated, closed };
}
