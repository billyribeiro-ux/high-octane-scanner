import type { PageServerLoad } from './$types';
import { getScanMeta } from '$lib/server/services/scan.service';
import { getUniverseMeta } from '$lib/server/services/screener.service';

export const load: PageServerLoad = async () => {
	const [meta, universe] = await Promise.all([getScanMeta(), getUniverseMeta()]);
	return { meta, universe };
};
