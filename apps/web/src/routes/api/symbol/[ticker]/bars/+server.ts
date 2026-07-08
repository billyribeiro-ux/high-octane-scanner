import { json, type RequestHandler } from '@sveltejs/kit';
import { getSymbolChart } from '$lib/server/services/symbol.service';

export const GET: RequestHandler = async ({ params, url }) => {
	const lookback = Number(url.searchParams.get('lookback') ?? '400');
	const data = await getSymbolChart(params.ticker ?? '', {
		lookback: Number.isFinite(lookback) ? lookback : 400
	});
	return json(data);
};
