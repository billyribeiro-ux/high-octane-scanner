/** Formatting helpers for financial data display. */

export function fmtNumber(v: number | null | undefined, digits = 2): string {
	if (v == null || !Number.isFinite(v)) return '—';
	return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPrice(v: number | null | undefined): string {
	if (v == null || !Number.isFinite(v)) return '—';
	return `$${fmtNumber(v, 2)}`;
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
	if (v == null || !Number.isFinite(v)) return '—';
	return `${(v * 100).toFixed(digits)}%`;
}

export function fmtSignedPct(v: number | null | undefined, digits = 1): string {
	if (v == null || !Number.isFinite(v)) return '—';
	const s = (v * 100).toFixed(digits);
	return `${v >= 0 ? '+' : ''}${s}%`;
}

export function fmtCompact(v: number | null | undefined): string {
	if (v == null || !Number.isFinite(v)) return '—';
	return v.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 });
}

export function fmtInt(v: number | null | undefined): string {
	if (v == null || !Number.isFinite(v)) return '—';
	return Math.round(v).toLocaleString('en-US');
}

/** Tailwind text-color class for a signed value. */
export function changeColor(v: number | null | undefined): string {
	if (v == null || v === 0) return 'text-muted-foreground';
	return v > 0 ? 'text-up' : 'text-down';
}
