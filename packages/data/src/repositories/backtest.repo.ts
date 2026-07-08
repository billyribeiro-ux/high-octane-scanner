import type { BacktestConfig, BacktestResult, EquityPoint, Metrics, Trade } from '@scanner/core';
import { exec, insertRows, queryOne, queryRows } from '../db/query.js';

export interface BacktestRunRecord {
	id: string;
	createdAt: string;
	scope: 'single' | 'portfolio';
	symbol: string | null;
	fromDate: string | null;
	toDate: string | null;
	config: BacktestConfig;
	metrics: Metrics;
	status: string;
}

export interface SaveRunInput {
	id: string;
	scope: 'single' | 'portfolio';
	symbol?: string | null;
	fromDate?: string | null;
	toDate?: string | null;
	config: BacktestConfig;
	result: BacktestResult;
	status?: string;
}

/** Persist a complete backtest: run metadata, trades and equity curve. */
export async function saveBacktest(input: SaveRunInput): Promise<void> {
	await exec(
		`INSERT OR REPLACE INTO backtest_runs
			(id, scope, symbol, from_date, to_date, config_json, metrics_json, status)
		 VALUES ($id, $scope, $symbol, CAST($from AS DATE), CAST($to AS DATE), $cfg, $metrics, $status)`,
		{
			id: input.id,
			scope: input.scope,
			symbol: input.symbol ?? null,
			from: input.fromDate ?? null,
			to: input.toDate ?? null,
			cfg: JSON.stringify(input.config),
			metrics: JSON.stringify(input.result.metrics),
			status: input.status ?? 'done'
		}
	);

	await exec('DELETE FROM backtest_trades WHERE run_id = $id', { id: input.id });
	await insertRows(
		'backtest_trades',
		[
			'run_id',
			'symbol',
			'direction',
			'entry_date',
			'entry_price',
			'exit_date',
			'exit_price',
			'exit_reason',
			'bars_held',
			'pnl',
			'pnl_pct',
			'r_multiple'
		],
		input.result.trades.map((t: Trade) => ({
			run_id: input.id,
			symbol: t.symbol,
			direction: t.direction,
			entry_date: t.entryDate,
			entry_price: t.entryPrice,
			exit_date: t.exitDate,
			exit_price: t.exitPrice,
			exit_reason: t.exitReason,
			bars_held: t.barsHeld,
			pnl: t.pnl,
			pnl_pct: t.pnlPct,
			r_multiple: t.rMultiple
		})),
		{ cast: { entry_date: 'DATE', exit_date: 'DATE' } }
	);

	await exec('DELETE FROM backtest_equity WHERE run_id = $id', { id: input.id });
	await insertRows(
		'backtest_equity',
		['run_id', 'date', 'equity', 'drawdown'],
		input.result.equityCurve.map((p: EquityPoint) => ({
			run_id: input.id,
			date: p.date,
			equity: p.equity,
			drawdown: p.drawdown
		})),
		{ cast: { date: 'DATE' } }
	);
}

interface RawRun {
	id: string;
	createdAt: string;
	scope: 'single' | 'portfolio';
	symbol: string | null;
	fromDate: string | null;
	toDate: string | null;
	config_json: string;
	metrics_json: string;
	status: string;
}

function parseRun(r: RawRun): BacktestRunRecord {
	return {
		id: r.id,
		createdAt: r.createdAt,
		scope: r.scope,
		symbol: r.symbol,
		fromDate: r.fromDate,
		toDate: r.toDate,
		config: JSON.parse(r.config_json) as BacktestConfig,
		metrics: JSON.parse(r.metrics_json) as Metrics,
		status: r.status
	};
}

const RUN_SELECT = `id, CAST(created_at AS VARCHAR) AS createdAt, scope, symbol,
	CAST(from_date AS VARCHAR) AS fromDate, CAST(to_date AS VARCHAR) AS toDate,
	config_json, metrics_json, status`;

export async function getRun(id: string): Promise<BacktestRunRecord | null> {
	const row = await queryOne<RawRun>(`SELECT ${RUN_SELECT} FROM backtest_runs WHERE id = $id`, {
		id
	});
	return row ? parseRun(row) : null;
}

export async function listRuns(limit = 50): Promise<BacktestRunRecord[]> {
	const rows = await queryRows<RawRun>(
		`SELECT ${RUN_SELECT} FROM backtest_runs ORDER BY created_at DESC LIMIT ${Math.floor(limit)}`
	);
	return rows.map(parseRun);
}

export async function getTrades(runId: string): Promise<Trade[]> {
	return queryRows<Trade>(
		`SELECT symbol, direction,
			CAST(entry_date AS VARCHAR) AS entryDate, entry_price AS entryPrice,
			CAST(exit_date AS VARCHAR) AS exitDate, exit_price AS exitPrice,
			exit_reason AS exitReason, bars_held AS barsHeld,
			pnl, pnl_pct AS pnlPct, r_multiple AS rMultiple
		 FROM backtest_trades WHERE run_id = $id ORDER BY entry_date`,
		{ id: runId }
	);
}

export async function getEquity(runId: string): Promise<EquityPoint[]> {
	return queryRows<EquityPoint>(
		`SELECT CAST(date AS VARCHAR) AS date, equity, drawdown
		 FROM backtest_equity WHERE run_id = $id ORDER BY date`,
		{ id: runId }
	);
}
