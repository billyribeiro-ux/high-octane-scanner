import { forwardRepo } from '@scanner/data';
import { ensureReady } from '$lib/server/db';

export async function getForwardPositions(opts: {
	status?: 'OPEN' | 'CLOSED';
	symbol?: string;
	limit?: number;
} = {}) {
	await ensureReady();
	const positions = await forwardRepo.listPositions(opts);
	const closed = positions.filter((p) => p.status === 'CLOSED');
	const wins = closed.filter((p) => (p.pnlPct ?? 0) > 0).length;
	const summary = {
		total: positions.length,
		open: positions.filter((p) => p.status === 'OPEN').length,
		closed: closed.length,
		winRate: closed.length > 0 ? wins / closed.length : 0,
		avgPnlPct:
			closed.length > 0
				? closed.reduce((a, p) => a + (p.pnlPct ?? 0), 0) / closed.length
				: 0
	};
	return { positions, summary };
}
