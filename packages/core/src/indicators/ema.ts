// Exponential moving average. Seeded with the simple average of the first
// `period` values (Wilder-free, the conventional charting seed), then rolled
// forward with smoothing factor k = 2 / (period + 1).

/**
 * Batch EMA. Returns an array the same length as `values`; entries before the
 * series has `period` samples are `null`.
 */
export function ema(values: number[], period: number): (number | null)[] {
	if (period <= 0 || !Number.isInteger(period)) {
		throw new Error(`ema: period must be a positive integer, got ${period}`);
	}
	const out: (number | null)[] = new Array(values.length).fill(null);
	if (values.length < period) return out;

	const k = 2 / (period + 1);
	let seed = 0;
	for (let i = 0; i < period; i++) seed += values[i] as number;
	let prev = seed / period;
	out[period - 1] = prev;

	for (let i = period; i < values.length; i++) {
		prev = (values[i] as number) * k + prev * (1 - k);
		out[i] = prev;
	}
	return out;
}

/** Incremental EMA, for streaming computation over a growing series. */
export class EmaState {
	readonly period: number;
	private readonly k: number;
	private value: number | null = null;
	private seedSum = 0;
	private count = 0;

	constructor(period: number) {
		if (period <= 0 || !Number.isInteger(period)) {
			throw new Error(`EmaState: period must be a positive integer, got ${period}`);
		}
		this.period = period;
		this.k = 2 / (period + 1);
	}

	/** Push the next value; returns the current EMA or `null` until seeded. */
	push(v: number): number | null {
		if (this.value === null) {
			this.seedSum += v;
			this.count += 1;
			if (this.count === this.period) this.value = this.seedSum / this.period;
			return this.value;
		}
		this.value = v * this.k + this.value * (1 - this.k);
		return this.value;
	}

	get current(): number | null {
		return this.value;
	}
}
