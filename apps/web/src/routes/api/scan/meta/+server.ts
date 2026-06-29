import { json, type RequestHandler } from '@sveltejs/kit';
import { getScanMeta } from '$lib/server/services/scan.service';

export const GET: RequestHandler = async () => {
	return json(await getScanMeta());
};
