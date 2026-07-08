import { json, type RequestHandler } from '@sveltejs/kit';
import { parseQuery } from '$lib/server/validate';
import { scanQuerySchema } from '$lib/schemas/scan.schema';
import { getLatestSignals } from '$lib/server/services/scan.service';

export const GET: RequestHandler = async ({ url }) => {
	const q = parseQuery(url, scanQuerySchema);
	const result = await getLatestSignals(q);
	return json(result);
};
