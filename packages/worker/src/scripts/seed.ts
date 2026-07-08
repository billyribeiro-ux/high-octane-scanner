import { backfillSymbols, FmpClient, loadDotenv, migrate } from '@scanner/data';

// Backfill full daily history for a handful of symbols (dev seed).
// Usage: pnpm --filter @scanner/worker seed -- AAPL MSFT NVDA
const DEFAULTS = ['AAPL', 'MSFT', 'NVDA', 'AMD', 'TSLA'];

async function main() {
	loadDotenv();
	const args = process.argv.slice(2).filter((a) => a && !a.startsWith('-'));
	const symbols = args.length > 0 ? args.map((s) => s.toUpperCase()) : DEFAULTS;
	await migrate();
	const client = new FmpClient();
	console.log(`[seed] backfilling ${symbols.length} symbols...`);
	const results = await backfillSymbols(client, symbols, {
		onProgress: (done, total, symbol) => console.log(`  [${done}/${total}] ${symbol}`)
	});
	for (const r of results) {
		console.log(`  ${r.symbol}: ${r.bars} bars${r.error ? ` (error: ${r.error})` : ''}`);
	}
	console.log('[seed] done');
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('[seed] failed:', err);
		process.exit(1);
	});
