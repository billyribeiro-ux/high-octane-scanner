import { symbolsRepo } from '@scanner/data';
import type { ScreenerFilters } from '@scanner/data';
import { ensureReady } from '$lib/server/db';

export async function screen(filters: ScreenerFilters) {
	await ensureReady();
	return symbolsRepo.screen(filters);
}

export async function getUniverseMeta() {
	await ensureReady();
	const [sectors, exchanges, industries, count] = await Promise.all([
		symbolsRepo.distinctValues('sector'),
		symbolsRepo.distinctValues('exchange'),
		symbolsRepo.distinctValues('industry'),
		symbolsRepo.symbolCount()
	]);
	return { sectors, exchanges, industries, symbolCount: count };
}
