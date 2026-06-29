import type { Direction, IndicatorRow } from '@scanner/core';
import { exec, insertRows, queryRows, queryScalar, type ParamValue } from '../db/query.js';

export interface PersistableSignal {
	symbol: string;
	date: string;
	direction: Direction;
	fresh: boolean;
	close: number;
	indicators: IndicatorRow;
}

export interface SignalListItem {
	symbol: string;
	signalDate: string;
	direction: Direction;
	fresh: boolean;
	close: number;
	ema5: number;
	ema9: number;
	ema21: number;
	sma50: number;
	sma100: number;
	sma200: number;
	name: string | null;
	sector: string | null;
	exchange: string | null;
	marketCap: number | null;
}

const SIGNAL_COLUMNS = [
	'symbol',
	'signal_date',
	'direction',
	'fresh',
	'close',
	'ema5',
	'ema9',
	'ema21',
	'sma50',
	'sma100',
	'sma200'
];

export async function upsertSignals(signals: PersistableSignal[]): Promise<number> {
	const rows = signals.map((s) => ({
		symbol: s.symbol,
		signal_date: s.date,
		direction: s.direction,
		fresh: s.fresh,
		close: s.close,
		ema5: s.indicators.ema5,
		ema9: s.indicators.ema9,
		ema21: s.indicators.ema21,
		sma50: s.indicators.sma50,
		sma100: s.indicators.sma100,
		sma200: s.indicators.sma200
	}));
	return insertRows('signals', SIGNAL_COLUMNS, rows, { orReplace: true, cast: { signal_date: 'DATE' } });
}

/** Remove all signals on a given date (used before re-persisting a scan). */
export async function deleteSignalsForDate(date: string): Promise<void> {
	await exec('DELETE FROM signals WHERE signal_date = CAST($d AS DATE)', { d: date });
}

export async function latestScanDate(): Promise<string | null> {
	return queryScalar<string>('SELECT CAST(max(signal_date) AS VARCHAR) FROM signals');
}

export interface LatestSignalsQuery {
	date?: string;
	direction?: Direction;
	sector?: string;
	freshOnly?: boolean;
	limit?: number;
	offset?: number;
}

const LIST_SELECT = `s.symbol,
	CAST(s.signal_date AS VARCHAR) AS signalDate,
	s.direction, s.fresh, s.close,
	s.ema5, s.ema9, s.ema21, s.sma50, s.sma100, s.sma200,
	sym.name, sym.sector, sym.exchange, sym.market_cap AS marketCap`;

function buildSignalWhere(
	q: LatestSignalsQuery,
	date: string
): { sql: string; params: Record<string, ParamValue> } {
	const clauses = ['s.signal_date = CAST($date AS DATE)'];
	const params: Record<string, ParamValue> = { date };
	if (q.direction) {
		clauses.push('s.direction = $dir');
		params.dir = q.direction;
	}
	if (q.sector) {
		clauses.push('sym.sector = $sector');
		params.sector = q.sector;
	}
	if (q.freshOnly) clauses.push('s.fresh = true');
	return { sql: ` WHERE ${clauses.join(' AND ')}`, params };
}

/** Signals for the latest scan date (or a specified date), with symbol metadata. */
export async function latest(
	q: LatestSignalsQuery = {}
): Promise<{ rows: SignalListItem[]; total: number; date: string | null }> {
	const date = q.date ?? (await latestScanDate());
	if (!date) return { rows: [], total: 0, date: null };

	const { sql: where, params } = buildSignalWhere(q, date);
	const total =
		(await queryScalar<number>(
			`SELECT count(*) FROM signals s LEFT JOIN symbols sym USING (symbol)${where}`,
			params
		)) ?? 0;

	const limit = Math.min(Math.max(Math.floor(q.limit ?? 200), 1), 5000);
	const offset = Math.max(Math.floor(q.offset ?? 0), 0);
	const rows = await queryRows<SignalListItem>(
		`SELECT ${LIST_SELECT} FROM signals s LEFT JOIN symbols sym USING (symbol)${where}
		 ORDER BY s.fresh DESC, abs(sym.market_cap) DESC NULLS LAST, s.symbol
		 LIMIT ${limit} OFFSET ${offset}`,
		params
	);
	return { rows, total, date };
}

export async function bySymbol(symbol: string, limit = 500): Promise<SignalListItem[]> {
	return queryRows<SignalListItem>(
		`SELECT ${LIST_SELECT} FROM signals s LEFT JOIN symbols sym USING (symbol)
		 WHERE s.symbol = $s ORDER BY s.signal_date DESC LIMIT ${Math.floor(limit)}`,
		{ s: symbol }
	);
}
