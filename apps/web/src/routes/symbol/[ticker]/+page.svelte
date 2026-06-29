<script lang="ts">
	import { goto } from '$app/navigation';
	import { ChartLineUp } from 'phosphor-svelte';
	import type { PageData } from './$types';
	import type { Signal } from '@scanner/core';
	import type { Column } from '$lib/components/columns';
	import Card from '$lib/components/ui/Card.svelte';
	import DirectionBadge from '$lib/components/ui/DirectionBadge.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import CandlestickChart from '$lib/components/charts/CandlestickChart.svelte';
	import { fmtPrice, fmtSignedPct, fmtCompact, changeColor } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	const bars = $derived(data.chart.bars);
	const last = $derived(bars.at(-1));
	const prev = $derived(bars.at(-2));
	const change = $derived(last && prev ? last.close / prev.close - 1 : 0);
	const currentSetup = $derived(
		data.chart.signals.find((s) => s.index === bars.length - 1) ?? null
	);
	const freshSignals = $derived(data.chart.signals.filter((s) => s.fresh).reverse());

	const columns: Column<Signal>[] = [
		{ key: 'date', label: 'Date', sortable: true, value: (r) => r.date, mono: true },
		{ key: 'direction', label: 'Signal', type: 'direction', value: (r) => r.direction },
		{ key: 'close', label: 'Close', align: 'right', mono: true, value: (r) => r.close, format: (r) => fmtPrice(r.close) }
	];
</script>

<header class="mb-5 flex flex-wrap items-center justify-between gap-3">
	<div>
		<div class="flex items-center gap-3">
			<h1 class="font-mono text-2xl font-bold">{data.ticker}</h1>
			{#if currentSetup}<DirectionBadge direction={currentSetup.direction} fresh={currentSetup.fresh} />{/if}
		</div>
		<p class="text-sm text-muted-foreground">
			{data.chart.meta?.name ?? 'Unknown'} · {data.chart.meta?.sector ?? '—'} · {data.chart.meta?.exchange ?? '—'}
		</p>
	</div>
	<div class="flex items-center gap-4">
		{#if last}
			<div class="text-right">
				<div class="font-mono text-2xl font-semibold">{fmtPrice(last.close)}</div>
				<div class="text-sm {changeColor(change)}">{fmtSignedPct(change)}</div>
			</div>
		{/if}
		<button onclick={() => goto(`/backtest?symbol=${data.ticker}`)} class="btn-primary"><ChartLineUp size={16} /> Backtest</button>
	</div>
</header>

{#if bars.length === 0}
	<div class="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
		No cached data for {data.ticker}. Seed it first (see Settings).
	</div>
{:else}
	<Card title="Price · EMA 5/9/21 · SMA 50/100/200">
		<CandlestickChart bars={data.chart.bars} indicators={data.chart.indicators} signals={data.chart.signals} height={480} />
	</Card>

	<div class="mt-6 grid gap-6 lg:grid-cols-2">
		<Card title="Signal History (fresh events)">
			<DataTable {columns} rows={freshSignals} rowKey={(r) => `${r.date}-${r.direction}`} emptyMessage="No signal events in window" />
		</Card>
		<Card title="Latest Indicators">
			{#if currentSetup}
				{@const ind = currentSetup.indicators}
				<dl class="grid grid-cols-2 gap-2 font-mono text-sm">
					<div class="flex justify-between"><dt class="text-muted-foreground">EMA5</dt><dd>{ind.ema5.toFixed(2)}</dd></div>
					<div class="flex justify-between"><dt class="text-muted-foreground">EMA9</dt><dd>{ind.ema9.toFixed(2)}</dd></div>
					<div class="flex justify-between"><dt class="text-muted-foreground">EMA21</dt><dd>{ind.ema21.toFixed(2)}</dd></div>
					<div class="flex justify-between"><dt class="text-muted-foreground">SMA50</dt><dd>{ind.sma50.toFixed(2)}</dd></div>
					<div class="flex justify-between"><dt class="text-muted-foreground">SMA100</dt><dd>{ind.sma100.toFixed(2)}</dd></div>
					<div class="flex justify-between"><dt class="text-muted-foreground">SMA200</dt><dd>{ind.sma200.toFixed(2)}</dd></div>
				</dl>
			{:else}
				<p class="text-sm text-muted-foreground">No active setup on the latest bar.</p>
			{/if}
		</Card>
	</div>
{/if}

<style>
	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: 0.5rem;
		background: hsl(var(--primary));
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: hsl(var(--primary-foreground));
	}
</style>
