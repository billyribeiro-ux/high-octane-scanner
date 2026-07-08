import { runScan, signalsRepo, syncStateRepo, SYNC_KEYS } from '@scanner/data';
import type { LatestSignalsQuery } from '@scanner/data';
import { ensureReady } from '$lib/server/db';

let scanning = false;

export async function getLatestSignals(query: LatestSignalsQuery) {
	await ensureReady();
	return signalsRepo.latest(query);
}

export async function getSignalsBySymbol(symbol: string) {
	await ensureReady();
	return signalsRepo.bySymbol(symbol.toUpperCase());
}

/** Run a scan now, guarded so concurrent requests don't double-run it. */
export async function runScanNow() {
	await ensureReady();
	if (scanning) return { status: 'busy' as const };
	scanning = true;
	try {
		const result = await runScan();
		return { status: 'ok' as const, ...result };
	} finally {
		scanning = false;
	}
}

export async function getScanMeta() {
	await ensureReady();
	const [lastScan, lastBulk] = await Promise.all([
		signalsRepo.latestScanDate(),
		syncStateRepo.getSyncState(SYNC_KEYS.lastEodBulkDate)
	]);
	return { lastScanDate: lastScan, lastEodDate: lastBulk };
}
