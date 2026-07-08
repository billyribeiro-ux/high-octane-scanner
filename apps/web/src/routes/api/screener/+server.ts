import { json, type RequestHandler } from '@sveltejs/kit';
import { readJson } from '$lib/server/validate';
import { screenerSchema } from '$lib/schemas/screener.schema';
import { screen } from '$lib/server/services/screener.service';

export const POST: RequestHandler = async ({ request }) => {
	const filters = await readJson(request, screenerSchema);
	return json(await screen(filters));
};
