<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { SignalListItem } from '@scanner/data';
	import type { Column } from '$lib/components/columns';
	import Stat from '$lib/components/ui/Stat.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import SectorHeatmap3D from '$lib/components/charts/SectorHeatmap3D.svelte';
	import { fmtPrice, fmtInt, fmtPct } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	const columns: Column<SignalListItem>[] = [
		{ key: 'symbol', label: 'Symbol', sortable: true, value: (r) => r.symbol, mono: true },
		{ key: 'direction', label: 'Signal', type: 'direction', value: (r) => r.direction },
		{ key: 'close', label: 'Close', align: 'right', mono: true, sortable: true, value: (r) => r.close, format: (r) => fmtPrice(r.close) },
		{ key: 'sector', label: 'Sector', value: (r) => r.sector ?? '—' }
	];
</script>

<header class="mb-6">
	<h1 class="text-2xl font-bold">Dashboard</h1>
	<p class="text-sm text-muted-foreground">
		Latest scan: {data.signalDate ?? 'never'} · last EOD data: {data.meta.lastEodDate ?? '—'}
	</p>
</header>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
	<Stat label="Signals" value={fmtInt(data.totalSignals)} sub="latest scan" />
	<Stat label="Long" value={fmtInt(data.longCount)} valueClass="text-up" />
	<Stat label="Short" value={fmtInt(data.shortCount)} valueClass="text-down" />
	<Stat label="Universe" value={fmtInt(data.universe.symbolCount)} sub="symbols" />
	<Stat label="Forward Open" value={fmtInt(data.forward.open)} sub={`${fmtPct(data.forward.winRate)} win`} />
</div>

<div class="mt-6 grid gap-6 lg:grid-cols-2">
	<Card title="Sector Heatmap (3D)">
		<SectorHeatmap3D data={data.sectors} />
	</Card>

	<Card title="Recent Signals">
		{#if data.signals.length > 0}
			<DataTable {columns} rows={data.signals} rowKey={(r) => `${r.symbol}-${r.direction}`} onRowClick={(r) => goto(`/symbol/${r.symbol}`)} />
			<a href="/scanner" class="mt-3 inline-block text-sm text-primary hover:underline">View all signals →</a>
		{:else}
			<p class="py-6 text-center text-sm text-muted-foreground">
				No signals yet. Seed data and run a scan, or visit the
				<a href="/settings" class="text-primary hover:underline">Settings</a> page.
			</p>
		{/if}
	</Card>
</div>
