<script lang="ts">
	import { scaleLinear, line, area, curveMonotoneX, max, min } from 'd3';
	import { fmtNumber, fmtPct } from '$lib/utils/format';

	let {
		points,
		variant = 'equity',
		height = 220
	}: {
		points: { date: string; value: number }[];
		variant?: 'equity' | 'drawdown';
		height?: number;
	} = $props();

	let width = $state(640);
	const pad = { top: 10, right: 8, bottom: 18, left: 52 };

	const color = $derived(variant === 'drawdown' ? 'hsl(var(--down))' : 'hsl(var(--primary))');

	const x = $derived(
		scaleLinear()
			.domain([0, Math.max(1, points.length - 1)])
			.range([pad.left, width - pad.right])
	);

	const y = $derived.by(() => {
		const vals = points.map((p) => p.value);
		if (variant === 'drawdown') {
			const lo = min(vals) ?? 0;
			return scaleLinear().domain([lo, 0]).range([height - pad.bottom, pad.top]).nice();
		}
		const lo = min(vals) ?? 0;
		const hi = max(vals) ?? 1;
		const span = hi - lo || 1;
		return scaleLinear()
			.domain([lo - span * 0.04, hi + span * 0.04])
			.range([height - pad.bottom, pad.top]);
	});

	const linePath = $derived(
		line<{ date: string; value: number }>()
			.x((_d, i) => x(i))
			.y((d) => y(d.value))
			.curve(curveMonotoneX)(points) ?? ''
	);

	const areaPath = $derived(
		area<{ date: string; value: number }>()
			.x((_d, i) => x(i))
			.y0(variant === 'drawdown' ? y(0) : height - pad.bottom)
			.y1((d) => y(d.value))
			.curve(curveMonotoneX)(points) ?? ''
	);

	const yTicks = $derived(y.ticks(4));
	const fmtY = (v: number) => (variant === 'drawdown' ? fmtPct(v, 0) : fmtNumber(v, 0));
</script>

<div class="w-full" bind:clientWidth={width}>
	{#if points.length === 0}
		<div class="flex items-center justify-center text-sm text-muted-foreground" style="height:{height}px">
			No data
		</div>
	{:else}
		<svg {width} {height} class="overflow-visible">
			{#each yTicks as t (t)}
				<line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="hsl(var(--border))" stroke-width="1" opacity="0.5" />
				<text x={pad.left - 6} y={y(t)} dy="0.32em" text-anchor="end" class="fill-muted-foreground text-[10px] font-mono">{fmtY(t)}</text>
			{/each}
			<path d={areaPath} fill={color} opacity="0.12" />
			<path d={linePath} fill="none" stroke={color} stroke-width="1.5" />
		</svg>
	{/if}
</div>
