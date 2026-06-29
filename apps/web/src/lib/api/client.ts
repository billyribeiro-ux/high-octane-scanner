import type { SignalListItem, SymbolRow, ForwardPosition } from '@scanner/data';
import type { Bar, BacktestResult, EquityPoint, IndicatorRow, Metrics, Signal, Trade } from '@scanner/core';
import type { ScreenerInput } from '$lib/schemas/screener.schema';
import type { SingleBacktestInput, PortfolioBacktestInput } from '$lib/schemas/backtest.schema';

async function post<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error((await res.text()) || res.statusText);
	return res.json() as Promise<T>;
}

async function get<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error((await res.text()) || res.statusText);
	return res.json() as Promise<T>;
}

export interface SignalsResponse {
	rows: SignalListItem[];
	total: number;
	date: string | null;
}
export interface ScreenerResponse {
	rows: SymbolRow[];
	total: number;
}
export interface UniverseMeta {
	sectors: string[];
	exchanges: string[];
	industries: string[];
	symbolCount: number;
}
export interface SymbolChart {
	symbol: string;
	meta: SymbolRow | null;
	bars: Bar[];
	indicators: (IndicatorRow | null)[];
	signals: Signal[];
}
export interface SingleBacktestResponse {
	runId: string;
	result: BacktestResult;
	bars: number;
}
export interface PerSymbolResult {
	symbol: string;
	metrics: Metrics;
	trades: number;
}
export interface PortfolioJobResult {
	runId: string;
	metrics: Metrics;
	equityCurve: EquityPoint[];
	trades: Trade[];
	perSymbol: PerSymbolResult[];
	symbolsTested: number;
}
export interface ForwardResponse {
	positions: ForwardPosition[];
	summary: {
		total: number;
		open: number;
		closed: number;
		winRate: number;
		avgPnlPct: number;
	};
}

export const api = {
	latestSignals: (qs = '') => get<SignalsResponse>(`/api/scan/latest${qs}`),
	runScan: () => post<{ status: string; signalsFound?: number; date?: string | null }>('/api/scan/run', {}),
	scanMeta: () => get<{ lastScanDate: string | null; lastEodDate: string | null }>('/api/scan/meta'),
	screen: (filters: Partial<ScreenerInput>) => post<ScreenerResponse>('/api/screener', filters),
	universe: () => get<UniverseMeta>('/api/universe'),
	symbolBars: (ticker: string, lookback = 400) =>
		get<SymbolChart>(`/api/symbol/${encodeURIComponent(ticker)}/bars?lookback=${lookback}`),
	backtest: (input: SingleBacktestInput) => post<SingleBacktestResponse>('/api/backtest', input),
	portfolio: (input: PortfolioBacktestInput) =>
		post<{ runId: string; status: string }>('/api/backtest/portfolio', input),
	forward: (qs = '') => get<ForwardResponse>(`/api/forward-test${qs}`)
};

/** Trigger a file download from an export endpoint (browser only). */
export async function downloadExport(
	kind: 'csv' | 'xlsx',
	body: { dataset: 'signals' | 'backtest'; runId?: string; date?: string }
): Promise<void> {
	const res = await fetch(`/api/export/${kind}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error((await res.text()) || 'Export failed');
	const blob = await res.blob();
	const cd = res.headers.get('content-disposition') ?? '';
	const match = /filename="?([^"]+)"?/.exec(cd);
	const filename = match?.[1] ?? `export.${kind}`;
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
