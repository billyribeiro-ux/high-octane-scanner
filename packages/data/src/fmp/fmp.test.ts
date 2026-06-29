import { describe, expect, it, vi } from 'vitest';
import { FmpClient, FmpError } from './client.js';
import { historyFull, screenCompanies, batchQuotes } from './endpoints.js';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers }
	});
}

describe('FmpClient', () => {
	it('appends the api key and parses JSON', async () => {
		const fetchImpl = vi.fn(async (url: string | URL) => {
			expect(String(url)).toContain('apikey=TESTKEY');
			expect(String(url)).toContain('symbol=AAPL');
			return jsonResponse([{ symbol: 'AAPL', price: 1 }]);
		}) as unknown as typeof fetch;
		const client = new FmpClient({ apiKey: 'TESTKEY', fetchImpl, ratePerMin: 100000 });
		const data = await client.request<unknown[]>('quote', { symbol: 'AAPL' });
		expect(data).toEqual([{ symbol: 'AAPL', price: 1 }]);
	});

	it('retries on 429 then succeeds, honoring a 0s Retry-After', async () => {
		let calls = 0;
		const fetchImpl = vi.fn(async () => {
			calls += 1;
			if (calls === 1) return new Response('rate', { status: 429, headers: { 'retry-after': '0' } });
			return jsonResponse([{ ok: true }]);
		}) as unknown as typeof fetch;
		const client = new FmpClient({ apiKey: 'K', fetchImpl, ratePerMin: 100000, retries: 3 });
		const data = await client.request<unknown[]>('x');
		expect(calls).toBe(2);
		expect(data).toEqual([{ ok: true }]);
	});

	it('throws FmpError on a non-retryable 4xx', async () => {
		const fetchImpl = vi.fn(async () =>
			new Response('bad', { status: 401 })
		) as unknown as typeof fetch;
		const client = new FmpClient({ apiKey: 'K', fetchImpl, ratePerMin: 100000 });
		await expect(client.request('x')).rejects.toBeInstanceOf(FmpError);
	});

	it('redacts the api key in error messages', async () => {
		const fetchImpl = vi.fn(async () =>
			new Response('nope', { status: 403 })
		) as unknown as typeof fetch;
		const client = new FmpClient({ apiKey: 'SECRET', fetchImpl, ratePerMin: 100000 });
		const err = await client.request('x').catch((e: unknown) => e);
		expect(String((err as Error).message)).not.toContain('SECRET');
		expect(String((err as Error).message)).toContain('apikey=***');
	});
});

describe('endpoints', () => {
	it('historyFull reverses to ascending and fills adjClose', async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse([
				{ symbol: 'A', date: '2026-06-26', open: 2, high: 3, low: 1, close: 2.5, volume: 10 },
				{ symbol: 'A', date: '2026-06-25', open: 1, high: 2, low: 0.5, close: 1.5, volume: 5 }
			])
		) as unknown as typeof fetch;
		const client = new FmpClient({ apiKey: 'K', fetchImpl, ratePerMin: 100000 });
		const bars = await historyFull(client, 'A');
		expect(bars.map((b) => b.date)).toEqual(['2026-06-25', '2026-06-26']);
		expect(bars[0]?.adjClose).toBe(1.5); // falls back to close
	});

	it('screenCompanies maps to universe rows', async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse([
				{
					symbol: 'NVDA',
					companyName: 'NVIDIA',
					marketCap: 1000,
					sector: 'Technology',
					exchangeShortName: 'NASDAQ',
					price: 192,
					volume: 100,
					isEtf: false,
					isActivelyTrading: true
				}
			])
		) as unknown as typeof fetch;
		const client = new FmpClient({ apiKey: 'K', fetchImpl, ratePerMin: 100000 });
		const rows = await screenCompanies(client, { marketCapMoreThan: 1 });
		expect(rows[0]).toMatchObject({ symbol: 'NVDA', name: 'NVIDIA', exchange: 'NASDAQ', isEtf: false });
	});

	it('batchQuotes chunks symbols', async () => {
		const seen: string[] = [];
		const fetchImpl = vi.fn(async (url: string | URL) => {
			const u = new URL(String(url));
			seen.push(u.searchParams.get('symbol') ?? '');
			return jsonResponse([{ symbol: 'X', price: 1 }]);
		}) as unknown as typeof fetch;
		const client = new FmpClient({ apiKey: 'K', fetchImpl, ratePerMin: 100000 });
		await batchQuotes(client, ['A', 'B', 'C'], 2);
		expect(seen).toEqual(['A,B', 'C']);
	});
});
