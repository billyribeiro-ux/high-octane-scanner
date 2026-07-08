import type { Direction } from '@scanner/core';
import { insertRows, queryRows, type ParamValue } from '../db/query.js';

export interface ForwardPosition {
	symbol: string;
	entryDate: string;
	direction: Direction;
	entryPrice: number;
	currentDate: string | null;
	currentPrice: number | null;
	exitDate: string | null;
	exitPrice: number | null;
	exitReason: string | null;
	pnlPct: number | null;
	status: 'OPEN' | 'CLOSED';
	configJson: string | null;
}

const COLUMNS = [
	'symbol',
	'entry_date',
	'direction',
	'entry_price',
	'current_date',
	'current_price',
	'exit_date',
	'exit_price',
	'exit_reason',
	'pnl_pct',
	'status',
	'config_json'
];

/** Insert or update a forward-test position (keyed by symbol+entry_date+direction). */
export async function upsertPositions(positions: ForwardPosition[]): Promise<number> {
	const rows = positions.map((p) => ({
		symbol: p.symbol,
		entry_date: p.entryDate,
		direction: p.direction,
		entry_price: p.entryPrice,
		current_date: p.currentDate,
		current_price: p.currentPrice,
		exit_date: p.exitDate,
		exit_price: p.exitPrice,
		exit_reason: p.exitReason,
		pnl_pct: p.pnlPct,
		status: p.status,
		config_json: p.configJson
	}));
	return insertRows('forward_test_positions', COLUMNS, rows, {
		orReplace: true,
		cast: { entry_date: 'DATE', current_date: 'DATE', exit_date: 'DATE' }
	});
}

const SELECT = `symbol, CAST(entry_date AS VARCHAR) AS entryDate, direction,
	entry_price AS entryPrice, CAST(current_date AS VARCHAR) AS currentDate, current_price AS currentPrice,
	CAST(exit_date AS VARCHAR) AS exitDate, exit_price AS exitPrice, exit_reason AS exitReason,
	pnl_pct AS pnlPct, status, config_json AS configJson`;

export async function listOpenPositions(): Promise<ForwardPosition[]> {
	return queryRows<ForwardPosition>(
		`SELECT ${SELECT} FROM forward_test_positions WHERE status = 'OPEN' ORDER BY entry_date DESC`
	);
}

export async function listPositions(
	opts: { status?: 'OPEN' | 'CLOSED'; symbol?: string; limit?: number } = {}
): Promise<ForwardPosition[]> {
	const clauses: string[] = [];
	const params: Record<string, ParamValue> = {};
	if (opts.status) {
		clauses.push('status = $status');
		params.status = opts.status;
	}
	if (opts.symbol) {
		clauses.push('symbol = $symbol');
		params.symbol = opts.symbol;
	}
	const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
	const limit = Math.floor(opts.limit ?? 500);
	return queryRows<ForwardPosition>(
		`SELECT ${SELECT} FROM forward_test_positions${where} ORDER BY entry_date DESC LIMIT ${limit}`,
		params
	);
}
