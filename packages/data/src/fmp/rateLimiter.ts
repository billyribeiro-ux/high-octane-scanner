/** Simple async token-bucket limiter (requests per minute, with burst). */
export class RateLimiter {
	private tokens: number;
	private lastRefill: number;
	private readonly ratePerMs: number;

	constructor(
		ratePerMin: number,
		private readonly capacity: number = Math.max(1, Math.ceil(ratePerMin / 6))
	) {
		this.ratePerMs = ratePerMin / 60_000;
		this.tokens = this.capacity;
		this.lastRefill = Date.now();
	}

	private refill(): void {
		const now = Date.now();
		const elapsed = now - this.lastRefill;
		if (elapsed > 0) {
			this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.ratePerMs);
			this.lastRefill = now;
		}
	}

	/** Resolve once `weight` tokens are available, sleeping if necessary. */
	async acquire(weight = 1): Promise<void> {
		// Loop guards against timer drift / concurrent acquirers.
		for (;;) {
			this.refill();
			if (this.tokens >= weight) {
				this.tokens -= weight;
				return;
			}
			const deficit = weight - this.tokens;
			const waitMs = Math.max(5, Math.ceil(deficit / this.ratePerMs));
			await sleep(waitMs);
		}
	}
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
