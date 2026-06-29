import type { PageServerLoad } from './$types';
import { getUniverseMeta, screen } from '$lib/server/services/screener.service';

export const load: PageServerLoad = async () => {
	const [universe, initial] = await Promise.all([
		getUniverseMeta(),
		screen({ limit: 100, sort: 'marketCap', dir: 'desc' })
	]);
	return { universe, initial };
};
