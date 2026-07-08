import { json, type RequestHandler } from '@sveltejs/kit';
import { getForwardPositions } from '$lib/server/services/forward.service';

export const GET: RequestHandler = async ({ url }) => {
	const statusParam = url.searchParams.get('status');
	const status = statusParam === 'OPEN' || statusParam === 'CLOSED' ? statusParam : undefined;
	const symbol = url.searchParams.get('symbol') ?? undefined;
	return json(await getForwardPositions({ status, symbol }));
};
