import type { PageServerLoad } from './$types';
import { getLatestSignals, getScanMeta } from '$lib/server/services/scan.service';
import { getUniverseMeta } from '$lib/server/services/screener.service';

export const load: PageServerLoad = async () => {
	const [signals, meta, universe] = await Promise.all([
		getLatestSignals({ limit: 2000 }),
		getScanMeta(),
		getUniverseMeta()
	]);
	return {
		signals: signals.rows,
		total: signals.total,
		date: signals.date,
		meta,
		sectors: universe.sectors
	};
};
