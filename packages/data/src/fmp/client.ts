import { getDataEnv } from '../env.js';
import { RateLimiter, sleep } from './rateLimiter.js';

export class FmpError extends Error {
	constructor(
		message: string,
		readonly status?: number,
		readonly retryAfterMs?: number
	) {
		super(message);
		this.name = 'FmpError';
	}
}

export type ParamPrimitive = string | number | boolean | undefined | null;

export interface FmpClientOptions {
	apiKey?: string;
	baseUrl?: string;
	ratePerMin?: number;
	retries?: number;
	/** Injectable fetch (tests provide a mock). */
	fetchImpl?: typeof fetch;
}

const DEFAULT_BASE = 'https://financialmodelingprep.com/stable';

function isRetryableStatus(status: number): boolean {
	return status === 429 || status === 408 || (status >= 500 && status < 600);
}

/** Rate-limited, retrying client for the FMP `stable` API. */
export class FmpClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly retries: number;
	private readonly limiter: RateLimiter;
	private readonly fetchImpl: typeof fetch;

	constructor(opts: FmpClientOptions = {}) {
		const env = getDataEnv();
		this.apiKey = opts.apiKey ?? env.fmpApiKey;
		this.baseUrl = opts.baseUrl ?? DEFAULT_BASE;
		this.retries = opts.retries ?? 4;
		this.limiter = new RateLimiter(opts.ratePerMin ?? env.fmpRateLimitPerMin);
		this.fetchImpl = opts.fetchImpl ?? fetch;
		if (!this.apiKey) {
			throw new FmpError('FMP_API_KEY is not set; cannot call the FMP API.');
		}
	}

	buildUrl(path: string, params: Record<string, ParamPrimitive> = {}): string {
		const qs = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) {
			if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
		}
		qs.set('apikey', this.apiKey);
		const sep = path.startsWith('/') ? '' : '/';
		return `${this.baseUrl}${sep}${path}?${qs.toString()}`;
	}

	private async execute(url: string): Promise<Response> {
		let lastErr: unknown;
		for (let attempt = 0; attempt <= this.retries; attempt++) {
			await this.limiter.acquire();
			try {
				const res = await this.fetchImpl(url);
				if (res.ok) return res;
				if (attempt < this.retries && isRetryableStatus(res.status)) {
					const retryAfter = Number(res.headers.get('retry-after'));
					const delay = Number.isFinite(retryAfter) && retryAfter > 0
						? retryAfter * 1000
						: backoffDelay(attempt);
					await sleep(delay);
					continue;
				}
				const body = await res.text().catch(() => '');
				throw new FmpError(
					`FMP ${res.status} for ${redact(url)}: ${body.slice(0, 200)}`,
					res.status
				);
			} catch (err) {
				lastErr = err;
				if (err instanceof FmpError) throw err;
				// Network error — retry with backoff.
				if (attempt < this.retries) {
					await sleep(backoffDelay(attempt));
					continue;
				}
			}
		}
		throw new FmpError(`FMP request failed after ${this.retries + 1} attempts: ${String(lastErr)}`);
	}

	/** GET a JSON endpoint. */
	async request<T>(path: string, params?: Record<string, ParamPrimitive>): Promise<T> {
		const res = await this.execute(this.buildUrl(path, params));
		return (await res.json()) as T;
	}

	/** GET a raw-text endpoint (e.g. the EOD-bulk CSV). */
	async requestText(path: string, params?: Record<string, ParamPrimitive>): Promise<string> {
		const res = await this.execute(this.buildUrl(path, params));
		return res.text();
	}
}

function backoffDelay(attempt: number): number {
	const base = Math.min(16_000, 1000 * 2 ** attempt);
	return base + Math.floor(Math.random() * 250); // jitter
}

/** Hide the API key when surfacing URLs in errors/logs. */
function redact(url: string): string {
	return url.replace(/apikey=[^&]+/, 'apikey=***');
}
