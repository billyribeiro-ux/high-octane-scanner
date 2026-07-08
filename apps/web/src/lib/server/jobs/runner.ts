// Tiny in-memory job registry for long-running backtests, with a subscribe
// mechanism the SSE route uses to stream progress. Process-local (fine for a
// single-user app); jobs are also persisted to DuckDB on completion.

export interface JobProgress {
	phase: string;
	done: number;
	total: number;
}

export interface JobState<T = unknown> {
	id: string;
	status: 'running' | 'done' | 'error';
	progress: JobProgress;
	result?: T;
	error?: string;
}

type Listener = () => void;

const jobs = new Map<string, JobState>();
const listeners = new Map<string, Set<Listener>>();

export function createJob<T>(id: string): JobState<T> {
	const job: JobState<T> = {
		id,
		status: 'running',
		progress: { phase: 'starting', done: 0, total: 0 }
	};
	jobs.set(id, job as JobState);
	return job;
}

export function getJob<T>(id: string): JobState<T> | undefined {
	return jobs.get(id) as JobState<T> | undefined;
}

function emit(id: string): void {
	listeners.get(id)?.forEach((l) => l());
}

export function setProgress(id: string, progress: JobProgress): void {
	const j = jobs.get(id);
	if (!j) return;
	j.progress = progress;
	emit(id);
}

export function finishJob<T>(id: string, result: T): void {
	const j = jobs.get(id);
	if (!j) return;
	j.status = 'done';
	j.result = result;
	emit(id);
}

export function failJob(id: string, error: string): void {
	const j = jobs.get(id);
	if (!j) return;
	j.status = 'error';
	j.error = error;
	emit(id);
}

export function subscribe(id: string, listener: Listener): () => void {
	let set = listeners.get(id);
	if (!set) {
		set = new Set();
		listeners.set(id, set);
	}
	set.add(listener);
	return () => set?.delete(listener);
}
