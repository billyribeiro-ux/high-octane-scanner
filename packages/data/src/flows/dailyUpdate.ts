import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FmpClient } from '../fmp/client.js';
import { eodBulkCsv } from '../fmp/endpoints.js';
import { sleep } from '../fmp/rateLimiter.js';
import { findRepoRoot } from '../env.js';
import { ingestEodBulkCsv } from '../repositories/ohlcv.repo.js';
import { getSyncState, setSyncState, SYNC_KEYS } from '../repositories/syncState.repo.js';

function toISODate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Weekday dates (Mon–Fri) in [from, to], inclusive, as YYYY-MM-DD. */
function weekdaysBetween(from: Date, to: Date): string[] {
	const out: string[] = [];
	const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
	const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
	while (d.getTime() <= end) {
		const dow = d.getUTCDay();
		if (dow !== 0 && dow !== 6) out.push(toISODate(d));
		d.setUTCDate(d.getUTCDate() + 1);
	}
	return out;
}

export interface DailyUpdateOptions {
	/** Anchor date (defaults to now). Data is fetched up to the prior weekday. */
	today?: string;
	/** Gap between bulk calls; must exceed FMP's ~10s bulk cooldown. */
	cooldownMs?: number;
	/** Cap how many days to backfill in one run. */
	maxDays?: number;
	/** Keep only universe symbols when ingesting (default true). */
	onlyUniverse?: boolean;
}

/**
 * Incrementally ingest EOD bulk data for every weekday since the last sync, up
 * to yesterday. One bulk call covers all symbols; spaced by the bulk cooldown.
 */
export async function dailyUpdate(
	client: FmpClient,
	opts: DailyUpdateOptions = {}
): Promise<{ dates: string[]; rows: number }> {
	const cooldown = opts.cooldownMs ?? 11_000;
	const maxDays = opts.maxDays ?? 7;
	const anchor = opts.today ? new Date(`${opts.today}T00:00:00Z`) : new Date();
	const end = new Date(anchor);
	end.setUTCDate(end.getUTCDate() - 1); // EOD data for "today" lands after close

	const last = await getSyncState(SYNC_KEYS.lastEodBulkDate);
	let start: Date;
	if (last) {
		start = new Date(`${last}T00:00:00Z`);
		start.setUTCDate(start.getUTCDate() + 1);
	} else {
		start = new Date(end); // first run: just the most recent day
	}
	if (start.getTime() > end.getTime()) return { dates: [], rows: 0 };

	const dates = weekdaysBetween(start, end).slice(-maxDays);
	const scratch = join(findRepoRoot(), 'data', 'scratch');
	await mkdir(scratch, { recursive: true });

	const done: string[] = [];
	let rows = 0;
	for (let i = 0; i < dates.length; i++) {
		const date = dates[i] as string;
		const csv = await eodBulkCsv(client, date);
		if (csv && csv.includes(',') && !csv.includes('Limit Reach')) {
			const file = join(scratch, `eod-${date}.csv`);
			await writeFile(file, csv);
			rows += await ingestEodBulkCsv(file, { onlyUniverse: opts.onlyUniverse ?? true });
			done.push(date);
			await setSyncState(SYNC_KEYS.lastEodBulkDate, date);
		}
		if (i < dates.length - 1) await sleep(cooldown);
	}
	return { dates: done, rows };
}
