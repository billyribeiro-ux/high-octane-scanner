import { json, type RequestHandler } from '@sveltejs/kit';
import { getSignalsBySymbol } from '$lib/server/services/scan.service';

export const GET: RequestHandler = async ({ params }) => {
	const signals = await getSignalsBySymbol(params.symbol ?? '');
	return json({ signals });
};
