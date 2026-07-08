import type { Bar } from '@scanner/core';
import type { SymbolRow } from '../repositories/symbols.repo.js';
import type { FmpClient } from './client.js';

// --- Raw FMP response shapes (only the fields we use) ---

export interface FmpScreenerItem {
	symbol: string;
	companyName?: string;
	marketCap?: number;
	sector?: string;
	industry?: string;
	price?: number;
	volume?: number;
	exchange?: string;
	exchangeShortName?: string;
	country?: string;
	isEtf?: boolean;
	isFund?: boolean;
	isActivelyTrading?: boolean;
}

export interface FmpHistoryBar {
	symbol: string;
	date: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	adjClose?: number;
}

export interface FmpQuote {
	symbol: string;
	name?: string;
	price?: number;
	change?: number;
	changePercentage?: number;
	volume?: number;
	open?: number;
	previousClose?: number;
	marketCap?: number;
	exchange?: string;
	timestamp?: number;
}

export interface ScreenerParams {
	marketCapMoreThan?: number;
	marketCapLowerThan?: number;
	priceMoreThan?: number;
	volumeMoreThan?: number;
	exchange?: string;
	sector?: string;
	industry?: string;
	country?: string;
	isEtf?: boolean;
	isActivelyTrading?: boolean;
	limit?: number;
}

/** Stock screener → maps directly to our universe rows. */
export async function screenCompanies(
	client: FmpClient,
	params: ScreenerParams = {}
): Promise<SymbolRow[]> {
	const items = await client.request<FmpScreenerItem[]>('company-screener', {
		marketCapMoreThan: params.marketCapMoreThan,
		marketCapLowerThan: params.marketCapLowerThan,
		priceMoreThan: params.priceMoreThan,
		volumeMoreThan: params.volumeMoreThan,
		exchange: params.exchange,
		sector: params.sector,
		industry: params.industry,
		country: params.country,
		isEtf: params.isEtf,
		isActivelyTrading: params.isActivelyTrading,
		limit: params.limit ?? 10_000
	});
	return (items ?? []).map(screenerToSymbolRow);
}

export function screenerToSymbolRow(it: FmpScreenerItem): SymbolRow {
	return {
		symbol: it.symbol,
		name: it.companyName ?? null,
		exchange: it.exchangeShortName ?? it.exchange ?? null,
		sector: it.sector ?? null,
		industry: it.industry ?? null,
		marketCap: it.marketCap ?? null,
		price: it.price ?? null,
		volume: it.volume ?? null,
		isEtf: it.isEtf ?? false,
		isActive: it.isActivelyTrading ?? true
	};
}

/**
 * Full daily history for a symbol. FMP returns most-recent-first and omits
 * adjusted close on this endpoint, so we reverse to ascending and fall back to
 * `close` for `adjClose`.
 */
export async function historyFull(
	client: FmpClient,
	symbol: string,
	opts: { from?: string; to?: string } = {}
): Promise<Bar[]> {
	const rows = await client.request<FmpHistoryBar[]>('historical-price-eod/full', {
		symbol,
		from: opts.from,
		to: opts.to
	});
	if (!Array.isArray(rows)) return [];
	return rows
		.map((r) => ({
			date: r.date,
			open: r.open,
			high: r.high,
			low: r.low,
			close: r.close,
			adjClose: r.adjClose ?? r.close,
			volume: r.volume ?? 0
		}))
		.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Raw EOD-bulk CSV for a single date (all symbols). */
export async function eodBulkCsv(client: FmpClient, date: string): Promise<string> {
	return client.requestText('eod-bulk', { date });
}

/** Batch quotes, chunked to keep URLs short. */
export async function batchQuotes(
	client: FmpClient,
	symbols: string[],
	chunkSize = 50
): Promise<FmpQuote[]> {
	const out: FmpQuote[] = [];
	for (let i = 0; i < symbols.length; i += chunkSize) {
		const chunk = symbols.slice(i, i + chunkSize);
		const quotes = await client.request<FmpQuote[]>('quote', { symbol: chunk.join(',') });
		if (Array.isArray(quotes)) out.push(...quotes);
	}
	return out;
}

async function distinctList(
	client: FmpClient,
	path: string,
	key: string
): Promise<string[]> {
	const rows = await client.request<Array<Record<string, string>>>(path);
	if (!Array.isArray(rows)) return [];
	return rows.map((r) => r[key]).filter((v): v is string => typeof v === 'string');
}

export const availableSectors = (c: FmpClient) =>
	distinctList(c, 'available-sectors', 'sector');
export const availableIndustries = (c: FmpClient) =>
	distinctList(c, 'available-industries', 'industry');
export const availableExchanges = (c: FmpClient) =>
	distinctList(c, 'available-exchanges', 'exchange');
