import { error, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { readJson } from '$lib/server/validate';
import {
	buildBacktestCsv,
	buildBacktestXlsx,
	buildSignalsCsv,
	buildSignalsXlsx
} from '$lib/server/services/export.service';

const exportSchema = z.object({
	dataset: z.enum(['signals', 'backtest']),
	runId: z.string().optional(),
	date: z.string().optional()
});

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const POST: RequestHandler = async ({ params, request }) => {
	const kind = params.kind;
	if (kind !== 'csv' && kind !== 'xlsx') throw error(400, 'kind must be csv or xlsx');
	const body = await readJson(request, exportSchema);

	if (body.dataset === 'backtest' && !body.runId) throw error(400, 'runId required for backtest export');

	const stamp = body.date ?? new Date().toISOString().slice(0, 10);
	const base = body.dataset === 'signals' ? `signals-${stamp}` : `backtest-${body.runId}`;

	if (kind === 'csv') {
		const csv =
			body.dataset === 'signals'
				? await buildSignalsCsv(body.date)
				: await buildBacktestCsv(body.runId as string);
		return new Response(csv, {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="${base}.csv"`
			}
		});
	}

	const buffer =
		body.dataset === 'signals'
			? await buildSignalsXlsx(body.date)
			: await buildBacktestXlsx(body.runId as string);
	return new Response(new Uint8Array(buffer), {
		headers: {
			'content-type': XLSX_TYPE,
			'content-disposition': `attachment; filename="${base}.xlsx"`
		}
	});
};
