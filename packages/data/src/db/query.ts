import type { DuckDBValue } from '@duckdb/node-api';
import { getConnection } from './connection.js';

export type ParamValue = string | number | boolean | bigint | null;
export type QueryParams = Record<string, ParamValue> | ParamValue[];

/** Convert DuckDB BIGINT (`bigint`) values to plain numbers for JS consumers. */
function normalize<T>(row: Record<string, unknown>): T {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(row)) {
		const v = row[key];
		out[key] = typeof v === 'bigint' ? Number(v) : v;
	}
	return out as T;
}

/** Run a statement with no result rows (DDL / INSERT / UPDATE). */
export async function exec(sql: string, params?: QueryParams): Promise<void> {
	const conn = await getConnection();
	await conn.run(sql, params as DuckDBValue[] | Record<string, DuckDBValue> | undefined);
}

/** Run a query and return all rows as plain objects (BIGINT → number). */
export async function queryRows<T>(sql: string, params?: QueryParams): Promise<T[]> {
	const conn = await getConnection();
	const reader = await conn.runAndReadAll(
		sql,
		params as DuckDBValue[] | Record<string, DuckDBValue> | undefined
	);
	return reader.getRowObjectsJS().map((r) => normalize<T>(r));
}

/** Run a query and return the first row, or null. */
export async function queryOne<T>(sql: string, params?: QueryParams): Promise<T | null> {
	const rows = await queryRows<T>(sql, params);
	return rows[0] ?? null;
}

/**
 * Insert many rows in chunks via a single multi-row statement per chunk.
 * `cast` names columns whose string value should be wrapped in a SQL CAST
 * (e.g. `{ date: 'DATE' }`). Missing values become NULL.
 */
export async function insertRows(
	table: string,
	columns: string[],
	rows: Array<Record<string, ParamValue>>,
	opts: { orReplace?: boolean; cast?: Record<string, string> } = {}
): Promise<number> {
	if (rows.length === 0) return 0;
	const CHUNK = 200;
	const verb = opts.orReplace ? 'INSERT OR REPLACE INTO' : 'INSERT INTO';
	let total = 0;
	for (let i = 0; i < rows.length; i += CHUNK) {
		const slice = rows.slice(i, i + CHUNK);
		const params: Record<string, ParamValue> = {};
		const valuesSql = slice.map((row, j) => {
			const cells = columns.map((col) => {
				const key = `c${j}_${col}`;
				params[key] = row[col] ?? null;
				const castType = opts.cast?.[col];
				return castType ? `CAST($${key} AS ${castType})` : `$${key}`;
			});
			return `(${cells.join(',')})`;
		});
		await exec(`${verb} ${table} (${columns.join(',')}) VALUES ${valuesSql.join(',')}`, params);
		total += slice.length;
	}
	return total;
}

/** Run a query and return a single scalar value from the first row/column. */
export async function queryScalar<T = number>(
	sql: string,
	params?: QueryParams
): Promise<T | null> {
	const conn = await getConnection();
	const reader = await conn.runAndReadAll(
		sql,
		params as DuckDBValue[] | Record<string, DuckDBValue> | undefined
	);
	const rows = reader.getRowsJS();
	const first = rows[0];
	if (!first || first.length === 0) return null;
	const v = first[0];
	return (typeof v === 'bigint' ? Number(v) : v) as T;
}
