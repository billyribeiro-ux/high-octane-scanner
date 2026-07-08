import type { PageServerLoad } from './$types';
import { getSymbolChart } from '$lib/server/services/symbol.service';

export const load: PageServerLoad = async ({ params }) => {
	const ticker = (params.ticker ?? '').toUpperCase();
	const chart = await getSymbolChart(ticker, { lookback: 500 });
	return { ticker, chart };
};
