import { insertRows, queryRows, queryScalar, type ParamValue } from '../db/query.js';

export interface SymbolRow {
	symbol: string;
	name: string | null;
	exchange: string | null;
	sector: string | null;
	industry: string | null;
	marketCap: number | null;
	price: number | null;
	volume: number | null;
	isEtf: boolean | null;
	isActive: boolean | null;
}

export interface ScreenerFilters {
	priceMin?: number;
	priceMax?: number;
	marketCapMin?: number;
	marketCapMax?: number;
	volumeMin?: number;
	sectors?: string[];
	exchanges?: string[];
	isEtf?: boolean;
	search?: string;
	sort?: keyof SymbolRow;
	dir?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

const SYMBOL_COLUMNS = [
	'symbol',
	'name',
	'exchange',
	'sector',
	'industry',
	'market_cap',
	'price',
	'volume',
	'is_etf',
	'is_active'
];

const SELECT =
	'symbol, name, exchange, sector, industry, market_cap AS marketCap, price, volume, is_etf AS isEtf, is_active AS isActive';

export async function upsertSymbols(rows: SymbolRow[]): Promise<number> {
	const mapped = rows.map((r) => ({
		symbol: r.symbol,
		name: r.name,
		exchange: r.exchange,
		sector: r.sector,
		industry: r.industry,
		market_cap: r.marketCap,
		price: r.price,
		volume: r.volume == null ? null : Math.round(r.volume),
		is_etf: r.isEtf,
		is_active: r.isActive
	}));
	return insertRows('symbols', SYMBOL_COLUMNS, mapped, { orReplace: true });
}

const SORT_COLUMNS: Record<string, string> = {
	symbol: 'symbol',
	name: 'name',
	marketCap: 'market_cap',
	price: 'price',
	volume: 'volume',
	sector: 'sector',
	exchange: 'exchange'
};

function buildWhere(f: ScreenerFilters): { sql: string; params: Record<string, ParamValue> } {
	const clauses: string[] = [];
	const params: Record<string, ParamValue> = {};
	if (f.priceMin != null) {
		clauses.push('price >= $priceMin');
		params.priceMin = f.priceMin;
	}
	if (f.priceMax != null) {
		clauses.push('price <= $priceMax');
		params.priceMax = f.priceMax;
	}
	if (f.marketCapMin != null) {
		clauses.push('market_cap >= $mcMin');
		params.mcMin = f.marketCapMin;
	}
	if (f.marketCapMax != null) {
		clauses.push('market_cap <= $mcMax');
		params.mcMax = f.marketCapMax;
	}
	if (f.volumeMin != null) {
		clauses.push('volume >= $volMin');
		params.volMin = Math.round(f.volumeMin);
	}
	if (f.isEtf != null) {
		clauses.push('is_etf = $isEtf');
		params.isEtf = f.isEtf;
	}
	if (f.search) {
		clauses.push('(symbol ILIKE $search OR name ILIKE $search)');
		params.search = `%${f.search}%`;
	}
	if (f.sectors && f.sectors.length > 0) {
		const keys = f.sectors.map((s, i) => {
			params[`sector${i}`] = s;
			return `$sector${i}`;
		});
		clauses.push(`sector IN (${keys.join(',')})`);
	}
	if (f.exchanges && f.exchanges.length > 0) {
		const keys = f.exchanges.map((s, i) => {
			params[`exch${i}`] = s;
			return `$exch${i}`;
		});
		clauses.push(`exchange IN (${keys.join(',')})`);
	}
	return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', params };
}

/** Filter the universe; returns the page of rows plus the total match count. */
export async function screen(
	f: ScreenerFilters = {}
): Promise<{ rows: SymbolRow[]; total: number }> {
	const { sql: where, params } = buildWhere(f);
	const total =
		(await queryScalar<number>(`SELECT count(*) FROM symbols${where}`, params)) ?? 0;

	const sortCol = (f.sort && SORT_COLUMNS[f.sort]) || 'market_cap';
	const dir = f.dir === 'asc' ? 'ASC' : 'DESC';
	const limit = Math.min(Math.max(Math.floor(f.limit ?? 100), 1), 5000);
	const offset = Math.max(Math.floor(f.offset ?? 0), 0);

	const rows = await queryRows<SymbolRow>(
		`SELECT ${SELECT} FROM symbols${where} ORDER BY ${sortCol} ${dir} NULLS LAST LIMIT ${limit} OFFSET ${offset}`,
		params
	);
	return { rows, total };
}

/** Symbols eligible for scanning (active; optionally restricted to non-ETFs). */
export async function listScanSymbols(opts: { includeEtf?: boolean } = {}): Promise<string[]> {
	let sql = 'SELECT symbol FROM symbols WHERE COALESCE(is_active, true)';
	if (opts.includeEtf === false) sql += ' AND COALESCE(is_etf, false) = false';
	sql += ' ORDER BY symbol';
	const rows = await queryRows<{ symbol: string }>(sql);
	return rows.map((r) => r.symbol);
}

export async function getSymbol(symbol: string): Promise<SymbolRow | null> {
	const rows = await queryRows<SymbolRow>(`SELECT ${SELECT} FROM symbols WHERE symbol = $s`, {
		s: symbol
	});
	return rows[0] ?? null;
}

export async function distinctValues(column: 'sector' | 'exchange' | 'industry'): Promise<string[]> {
	const rows = await queryRows<{ v: string | null }>(
		`SELECT DISTINCT ${column} AS v FROM symbols WHERE ${column} IS NOT NULL ORDER BY v`
	);
	return rows.map((r) => r.v).filter((v): v is string => v != null);
}

export async function symbolCount(): Promise<number> {
	return (await queryScalar<number>('SELECT count(*) FROM symbols')) ?? 0;
}
