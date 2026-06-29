import { loadDotenv, migrate } from '@scanner/data';
import { runDailyJob } from '../jobs.js';

// Run the full daily pipeline once (EOD update → scan → forward test).
async function main() {
	loadDotenv();
	await migrate();
	await runDailyJob();
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('[job] failed:', err);
		process.exit(1);
	});
