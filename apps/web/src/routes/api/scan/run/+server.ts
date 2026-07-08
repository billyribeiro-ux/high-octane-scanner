import { json, type RequestHandler } from '@sveltejs/kit';
import { runScanNow } from '$lib/server/services/scan.service';

export const POST: RequestHandler = async () => {
	const result = await runScanNow();
	return json(result);
};
