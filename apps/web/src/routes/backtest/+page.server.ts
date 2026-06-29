import type { PageServerLoad } from './$types';
import { ohlcvRepo } from '@scanner/data';
import { ensureReady } from '$lib/server/db';
import { listBacktestRuns } from '$lib/server/services/backtest.service';

export const load: PageServerLoad = async ({ url }) => {
	await ensureReady();
	const [symbols, runs] = await Promise.all([ohlcvRepo.symbolsWithData(), listBacktestRuns()]);
	return { symbols, runs, preset: url.searchParams.get('symbol')?.toUpperCase() ?? '' };
};
