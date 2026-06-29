import { json, type RequestHandler } from '@sveltejs/kit';
import { listBacktestRuns } from '$lib/server/services/backtest.service';

export const GET: RequestHandler = async () => {
	return json({ runs: await listBacktestRuns() });
};
