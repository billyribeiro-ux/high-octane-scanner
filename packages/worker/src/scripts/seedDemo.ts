import type { Bar } from '@scanner/core';
import { loadDotenv, migrate, ohlcvRepo, runScan, symbolsRepo } from '@scanner/data';

// Deterministic synthetic data (no FMP) so CI and offline dev have a populated
// database for the e2e smoke and a quick UI demo.

function trendBars(base: number, slope: number, n = 320): Bar[] {
	const out: Bar[] = [];
	const start = Date.UTC(2024, 0, 1);
	for (let i = 0; i < n; i++) {
		const close = Math.max(1, base + slope * i + Math.sin(i / 6) * Math.abs(slope) * 2);
		const d = new Date(start);
		d.setUTCDate(d.getUTCDate() + i);
		out.push({
			date: d.toISOString().slice(0, 10),
			open: close - 0.2,
			high: close + 0.6,
			low: close - 0.6,
			close,
			adjClose: close,
			volume: 1_000_000 + i
		});
	}
	return out;
}

const DEMO = [
	{ symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', cap: 3.2e12, slope: 0.4, base: 100 },
	{ symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', exchange: 'NASDAQ', cap: 2.8e12, slope: 0.35, base: 120 },
	{ symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', exchange: 'NASDAQ', cap: 2.5e12, slope: 0.5, base: 80 },
	{ symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Defensive', exchange: 'NYSE', cap: 3.5e11, slope: -0.25, base: 180 },
	{ symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', exchange: 'NYSE', cap: 4.5e11, slope: -0.3, base: 200 },
	{ symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', exchange: 'NYSE', cap: 6.0e11, slope: -0.2, base: 220 }
];

async function main() {
	loadDotenv();
	await migrate();
	for (const d of DEMO) {
		await ohlcvRepo.upsertBars(d.symbol, trendBars(d.base, d.slope));
		await symbolsRepo.upsertSymbols([
			{
				symbol: d.symbol,
				name: d.name,
				exchange: d.exchange,
				sector: d.sector,
				industry: null,
				marketCap: d.cap,
				price: null,
				volume: 1_000_000,
				isEtf: false,
				isActive: true
			}
		]);
	}
	const scan = await runScan();
	console.log(`[seed:demo] ${DEMO.length} symbols seeded; scan found ${scan.signalsFound} signals on ${scan.date}`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('[seed:demo] failed:', err);
		process.exit(1);
	});
