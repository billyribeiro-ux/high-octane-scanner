import { json, type RequestHandler } from '@sveltejs/kit';
import { readJson } from '$lib/server/validate';
import { portfolioBacktestSchema } from '$lib/schemas/backtest.schema';
import { startPortfolioBacktest } from '$lib/server/services/backtest.service';

export const POST: RequestHandler = async ({ request }) => {
	const input = await readJson(request, portfolioBacktestSchema);
	const runId = startPortfolioBacktest(input);
	return json({ runId, status: 'running' });
};
