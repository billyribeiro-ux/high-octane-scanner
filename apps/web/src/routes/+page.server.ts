import type { PageServerLoad } from './$types';
import { getLatestSignals, getScanMeta } from '$lib/server/services/scan.service';
import { getUniverseMeta } from '$lib/server/services/screener.service';
import { getForwardPositions } from '$lib/server/services/forward.service';

export const load: PageServerLoad = async () => {
	const [signals, meta, universe, forward] = await Promise.all([
		getLatestSignals({ limit: 1000 }),
		getScanMeta(),
		getUniverseMeta(),
		getForwardPositions({ limit: 2000 })
	]);

	const bySector = new Map<string, { count: number; long: number; short: number }>();
	for (const s of signals.rows) {
		const sec = s.sector ?? 'Unknown';
		const e = bySector.get(sec) ?? { count: 0, long: 0, short: 0 };
		e.count += 1;
		if (s.direction === 'LONG') e.long += 1;
		else e.short += 1;
		bySector.set(sec, e);
	}
	const sectors = [...bySector.entries()]
		.map(([sector, v]) => ({ sector, count: v.count, net: v.count ? (v.long - v.short) / v.count : 0 }))
		.sort((a, b) => b.count - a.count);

	const longCount = signals.rows.filter((r) => r.direction === 'LONG').length;

	return {
		signals: signals.rows.slice(0, 15),
		totalSignals: signals.total,
		signalDate: signals.date,
		meta,
		universe,
		forward: forward.summary,
		sectors,
		longCount,
		shortCount: signals.rows.length - longCount
	};
};
