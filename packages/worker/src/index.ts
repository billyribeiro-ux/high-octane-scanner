import { schedule } from 'node-cron';
import { buildUniverse, FmpClient, loadDotenv, migrate } from '@scanner/data';
import { runDailyJob } from './jobs.js';

// Standalone scheduler process. NOTE: DuckDB is single-writer across processes —
// run this instead of (not alongside) a DB-writing web server, or point them at
// separate database files.
async function main() {
	loadDotenv();
	await migrate();

	const tz = process.env.TZ ?? 'America/New_York';
	console.log(`[worker] starting scheduler (timezone: ${tz})`);

	// Daily, 30 minutes after the US cash close (Mon–Fri).
	schedule('30 17 * * 1-5', () => void runDailyJob(), { timezone: 'America/New_York' });

	// Weekly universe refresh — Sunday 18:00 ET.
	schedule(
		'0 18 * * 0',
		() => {
			void buildUniverse(new FmpClient())
				.then((n) => console.log(`[worker] universe refreshed: ${n} symbols`))
				.catch((e) => console.error('[worker] universe refresh failed', e));
		},
		{ timezone: 'America/New_York' }
	);

	console.log('[worker] cron registered — daily job at 17:30 ET (Mon–Fri), universe refresh Sun 18:00 ET.');
	console.log('[worker] running. Press Ctrl-C to stop.');
}

main().catch((err) => {
	console.error('[worker] fatal:', err);
	process.exit(1);
});
