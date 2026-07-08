import { dailyUpdate, forwardUpdate, FmpClient, runScan } from '@scanner/data';

let running = false;

/**
 * The daily pipeline: ingest the latest EOD bulk data, recompute signals across
 * the universe, then update forward-test positions. Guarded against overlap.
 */
export async function runDailyJob(): Promise<void> {
	if (running) {
		console.log('[job] already running — skipping this trigger');
		return;
	}
	running = true;
	const started = Date.now();
	try {
		const client = new FmpClient();

		console.log('[job] 1/3 dailyUpdate (EOD ingest)…');
		const upd = await dailyUpdate(client);
		console.log(`[job]     ingested ${upd.rows} rows for ${upd.dates.length} day(s): ${upd.dates.join(', ') || '(none)'}`);

		console.log('[job] 2/3 runScan…');
		const scan = await runScan();
		console.log(`[job]     ${scan.signalsFound} signals across ${scan.scanned} symbols on ${scan.date ?? '—'}`);

		console.log('[job] 3/3 forwardUpdate…');
		const fwd = await forwardUpdate(client);
		console.log(`[job]     opened ${fwd.opened}, updated ${fwd.updated}, closed ${fwd.closed}`);
	} catch (err) {
		console.error('[job] failed:', err);
	} finally {
		running = false;
		console.log(`[job] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
	}
}
