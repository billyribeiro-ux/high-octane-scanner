import type { RequestHandler } from '@sveltejs/kit';
import { getJob, subscribe } from '$lib/server/jobs/runner';

/** Server-sent events streaming a portfolio backtest job's progress. */
export const GET: RequestHandler = ({ params }) => {
	const runId = params.runId ?? '';
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			let unsubscribe = () => {};
			let closed = false;

			const close = () => {
				if (closed) return;
				closed = true;
				unsubscribe();
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			};

			const send = () => {
				if (closed) return;
				const job = getJob(runId);
				if (!job) {
					controller.enqueue(
						encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'unknown job' })}\n\n`)
					);
					close();
					return;
				}
				const event = job.status === 'running' ? 'progress' : job.status;
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(job)}\n\n`));
				if (job.status !== 'running') close();
			};

			unsubscribe = subscribe(runId, send);
			send(); // emit current state immediately
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive'
		}
	});
};
