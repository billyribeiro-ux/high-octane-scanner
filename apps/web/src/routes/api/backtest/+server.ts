import { json, type RequestHandler } from '@sveltejs/kit';
import { readJson } from '$lib/server/validate';
import { singleBacktestSchema } from '$lib/schemas/backtest.schema';
import { runSingleBacktest } from '$lib/server/services/backtest.service';

export const POST: RequestHandler = async ({ request }) => {
	const input = await readJson(request, singleBacktestSchema);
	return json(await runSingleBacktest(input));
};
