import { buildUniverse, FmpClient, loadDotenv, migrate, symbolsRepo } from '@scanner/data';

// Build the tradable US universe from the FMP screener.
async function main() {
	loadDotenv();
	await migrate();
	const client = new FmpClient();
	console.log('[universe] building from FMP screener...');
	const count = await buildUniverse(client, {
		marketCapMoreThan: 300_000_000,
		volumeMoreThan: 200_000,
		exchanges: ['NASDAQ', 'NYSE', 'AMEX'],
		includeEtf: true
	});
	console.log(`[universe] stored ${count} symbols (total now ${await symbolsRepo.symbolCount()})`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('[universe] failed:', err);
		process.exit(1);
	});
