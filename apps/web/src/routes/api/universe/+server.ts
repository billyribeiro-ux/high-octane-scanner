import { json, type RequestHandler } from '@sveltejs/kit';
import { getUniverseMeta } from '$lib/server/services/screener.service';

export const GET: RequestHandler = async () => {
	return json(await getUniverseMeta());
};
