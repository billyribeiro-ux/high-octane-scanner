import type { Bar } from '@scanner/core';
import { exec, insertRows, queryRows, queryScalar, type ParamValue } from '../db/query.js';

const OHLCV_COLUMNS = ['symbol', 'date', 'open', 'high', 'low', 'close', 'adj_close', 'volume'];

/** Insert or replace daily bars for a single symbol. */
export async function upsertBars(symbol: string, bars: Bar[]): Promise<number> {
	const rows = bars.map((b) => ({
		symbol,
		date: b.date,
		open: b.open,
		high: b.high,
		low: b.low,
		close: b.close,
		adj_close: b.adjClose,
		volume: Math.round(b.volume)
	}));
	return insertRows('ohlcv_daily', OHLCV_COLUMNS, rows, {
		orReplace: true,
		cast: { date: 'DATE' }
	});
}

/**
 * Ingest an FMP EOD-bulk CSV (columns: symbol,date,open,low,high,close,adjClose,
 * volume) directly via DuckDB. The path is internally generated (safe to embed).
 */
export async function ingestEodBulkCsv(csvPath: string): Promise<number> {
	const escaped = csvPath.replace(/'/g, "''");
	const before = (await queryScalar<number>('SELECT count(*) FROM ohlcv_daily')) ?? 0;
	await exec(
		`INSERT OR REPLACE INTO ohlcv_daily (symbol, date, open, high, low, close, adj_close, volume)
		 SELECT symbol, CAST(date AS DATE), open, high, low, close, adjClose, CAST(volume AS BIGINT)
		 FROM read_csv('${escaped}', header = true, columns = {
			'symbol': 'VARCHAR', 'date': 'VARCHAR', 'open': 'DOUBLE', 'low': 'DOUBLE',
			'high': 'DOUBLE', 'close': 'DOUBLE', 'adjClose': 'DOUBLE', 'volume': 'DOUBLE'
		 })`
	);
	const after = (await queryScalar<number>('SELECT count(*) FROM ohlcv_daily')) ?? 0;
	return after - before;
}

const BAR_SELECT =
	'CAST(date AS VARCHAR) AS date, open, high, low, close, adj_close AS adjClose, volume';

/** Bars for a symbol in ascending date order, optionally bounded/limited. */
export async function getBars(
	symbol: string,
	opts: { from?: string; to?: string; limit?: number } = {}
): Promise<Bar[]> {
	const params: Record<string, ParamValue> = { sym: symbol };
	let sql = `SELECT ${BAR_SELECT} FROM ohlcv_daily WHERE symbol = $sym`;
	if (opts.from) {
		sql += ' AND date >= CAST($from AS DATE)';
		params.from = opts.from;
	}
	if (opts.to) {
		sql += ' AND date <= CAST($to AS DATE)';
		params.to = opts.to;
	}
	sql += ' ORDER BY date ASC';
	if (opts.limit) sql += ` LIMIT ${Math.floor(opts.limit)}`;
	return queryRows<Bar>(sql, params);
}

/** The most recent `n` bars for a symbol, in ascending date order. */
export async function getRecentBars(symbol: string, n: number): Promise<Bar[]> {
	const sql = `SELECT date, open, high, low, close, adjClose, volume FROM (
			SELECT ${BAR_SELECT}, row_number() OVER (ORDER BY date DESC) AS rn
			FROM ohlcv_daily WHERE symbol = $sym
		) WHERE rn <= ${Math.floor(n)} ORDER BY date ASC`;
	return queryRows<Bar>(sql, { sym: symbol });
}

/**
 * The most recent `n` bars for every symbol that has at least `minBars` of
 * history, grouped by symbol (ascending date order within each).
 */
export async function getRecentBarsAll(n: number, minBars = 0): Promise<Map<string, Bar[]>> {
	const sql = `WITH ranked AS (
			SELECT symbol, CAST(date AS VARCHAR) AS date, open, high, low, close,
				adj_close AS adjClose, volume,
				row_number() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn,
				count(*) OVER (PARTITION BY symbol) AS cnt
			FROM ohlcv_daily
		)
		SELECT symbol, date, open, high, low, close, adjClose, volume
		FROM ranked WHERE rn <= ${Math.floor(n)} AND cnt >= ${Math.floor(minBars)}
		ORDER BY symbol, date ASC`;
	const rows = await queryRows<Bar & { symbol: string }>(sql);
	const map = new Map<string, Bar[]>();
	for (const r of rows) {
		const { symbol, ...bar } = r;
		let arr = map.get(symbol);
		if (!arr) {
			arr = [];
			map.set(symbol, arr);
		}
		arr.push(bar);
	}
	return map;
}

/** Latest (max) date present in the bar cache, as `YYYY-MM-DD`, or null. */
export async function latestBarDate(): Promise<string | null> {
	return queryScalar<string>('SELECT CAST(max(date) AS VARCHAR) FROM ohlcv_daily');
}

/** Distinct symbols that have any cached bars. */
export async function symbolsWithData(): Promise<string[]> {
	const rows = await queryRows<{ symbol: string }>(
		'SELECT DISTINCT symbol FROM ohlcv_daily ORDER BY symbol'
	);
	return rows.map((r) => r.symbol);
}
