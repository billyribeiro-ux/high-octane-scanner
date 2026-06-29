import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Bar } from '@scanner/core';
import { __setConnectionForTests, createMemoryConnection } from './connection.js';
import { migrate } from './migrate.js';
import * as ohlcv from '../repositories/ohlcv.repo.js';
import * as symbols from '../repositories/symbols.repo.js';
import * as signals from '../repositories/signals.repo.js';
import { runScan } from '../flows/runScan.js';

/** A strictly rising series ⇒ bullish MA stack + closes above EMA5 ⇒ SHORT. */
function risingBars(n: number, base = 50): Bar[] {
	return Array.from({ length: n }, (_, i) => {
		const close = base + i * 0.5;
		const day = (i % 28) + 1;
		const month = (Math.floor(i / 28) % 12) + 1;
		return {
			date: `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
			open: close - 0.1,
			high: close + 0.2,
			low: close - 0.2,
			close,
			adjClose: close,
			volume: 1_000_000 + i
		};
	});
}

beforeAll(async () => {
	__setConnectionForTests(await createMemoryConnection());
	await migrate();
});

afterAll(() => {
	__setConnectionForTests(null);
});

describe('OHLCV repository', () => {
	it('upserts and reads back bars', async () => {
		await ohlcv.upsertBars('AAA', risingBars(260));
		const bars = await ohlcv.getBars('AAA');
		expect(bars).toHaveLength(260);
		expect(bars[0]?.close).toBeCloseTo(50, 6);
		expect(typeof bars[0]?.volume).toBe('number'); // BIGINT normalized
		expect(await ohlcv.latestBarDate()).not.toBeNull();
	});

	it('ingests an FMP-style EOD bulk CSV', async () => {
		const csv = join(tmpdir(), `bulk-test-${process.pid}.csv`);
		writeFileSync(
			csv,
			'"symbol","date","open","low","high","close","adjClose","volume"\n' +
				'"ZZZ","2026-06-26",10,9,11,10.5,10.5,5000\n' +
				'"ZZZ","2026-06-25",9,8,10,9.5,9.5,4000\n'
		);
		const inserted = await ohlcv.ingestEodBulkCsv(csv);
		expect(inserted).toBe(2);
		const bars = await ohlcv.getBars('ZZZ');
		expect(bars.map((b) => b.date)).toEqual(['2026-06-25', '2026-06-26']);
	});
});

describe('symbols repository + screener', () => {
	it('upserts universe rows and filters them', async () => {
		await symbols.upsertSymbols([
			{
				symbol: 'AAA',
				name: 'Alpha Inc',
				exchange: 'NASDAQ',
				sector: 'Technology',
				industry: 'Software',
				marketCap: 5_000_000_000,
				price: 179.5,
				volume: 2_000_000,
				isEtf: false,
				isActive: true
			},
			{
				symbol: 'BBB',
				name: 'Beta Corp',
				exchange: 'NYSE',
				sector: 'Energy',
				industry: 'Oil',
				marketCap: 800_000_000,
				price: 40,
				volume: 500_000,
				isEtf: false,
				isActive: true
			}
		]);
		const all = await symbols.screen();
		expect(all.total).toBe(2);

		const tech = await symbols.screen({ sectors: ['Technology'] });
		expect(tech.rows.map((r) => r.symbol)).toEqual(['AAA']);

		const big = await symbols.screen({ marketCapMin: 1_000_000_000 });
		expect(big.rows.map((r) => r.symbol)).toEqual(['AAA']);

		expect(await symbols.distinctValues('sector')).toContain('Energy');
	});
});

describe('runScan flow', () => {
	it('detects SHORT setups on rising series and persists them', async () => {
		await ohlcv.upsertBars('BBB', risingBars(260, 30));
		const result = await runScan();
		expect(result.scanned).toBeGreaterThanOrEqual(2);
		expect(result.signalsFound).toBeGreaterThanOrEqual(2);

		const latest = await signals.latest();
		const aaa = latest.rows.find((r) => r.symbol === 'AAA');
		expect(aaa?.direction).toBe('SHORT');
		expect(aaa?.name).toBe('Alpha Inc'); // symbol metadata join
	});
});
