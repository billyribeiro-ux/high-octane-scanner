import { loadDotenv, migrate, runScan, signalsRepo } from '@scanner/data';

// Compute and persist latest signals across all cached symbols.
async function main() {
	loadDotenv();
	await migrate();
	const result = await runScan();
	console.log('[scan]', result);
	const latest = await signalsRepo.latest({ limit: 20 });
	console.log(`[scan] ${latest.total} signals on ${latest.date ?? '(none)'}`);
	for (const s of latest.rows) {
		console.log(`  ${s.direction.padEnd(5)} ${s.symbol.padEnd(6)} close=${s.close} fresh=${s.fresh}`);
	}
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('[scan] failed:', err);
		process.exit(1);
	});
