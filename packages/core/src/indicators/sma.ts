// Simple moving average via a rolling window sum.

/**
 * Batch SMA. Returns an array the same length as `values`; entries before the
 * window is full are `null`.
 */
export function sma(values: number[], period: number): (number | null)[] {
	if (period <= 0 || !Number.isInteger(period)) {
		throw new Error(`sma: period must be a positive integer, got ${period}`);
	}
	const out: (number | null)[] = new Array(values.length).fill(null);
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i] as number;
		if (i >= period) sum -= values[i - period] as number;
		if (i >= period - 1) out[i] = sum / period;
	}
	return out;
}

/** Incremental SMA over a fixed-size window. */
export class SmaState {
	readonly period: number;
	private readonly buf: number[] = [];
	private sum = 0;

	constructor(period: number) {
		if (period <= 0 || !Number.isInteger(period)) {
			throw new Error(`SmaState: period must be a positive integer, got ${period}`);
		}
		this.period = period;
	}

	push(v: number): number | null {
		this.buf.push(v);
		this.sum += v;
		if (this.buf.length > this.period) this.sum -= this.buf.shift() as number;
		return this.buf.length === this.period ? this.sum / this.period : null;
	}

	get current(): number | null {
		return this.buf.length === this.period ? this.sum / this.period : null;
	}
}
