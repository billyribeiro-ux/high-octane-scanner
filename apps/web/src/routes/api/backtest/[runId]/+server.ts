import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getJob } from '$lib/server/jobs/runner';
import { getBacktestRun } from '$lib/server/services/backtest.service';

export const GET: RequestHandler = async ({ params }) => {
	const runId = params.runId ?? '';
	// A live (portfolio) job takes precedence while it is running.
	const job = getJob(runId);
	if (job && job.status === 'running') {
		return json({ kind: 'job', ...job });
	}
	const run = await getBacktestRun(runId);
	if (run) return json({ kind: 'run', ...run });
	if (job) return json({ kind: 'job', ...job });
	throw error(404, `Backtest ${runId} not found`);
};
