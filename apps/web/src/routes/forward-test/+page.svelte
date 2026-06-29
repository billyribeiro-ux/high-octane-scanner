<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { ForwardPosition } from '@scanner/data';
	import type { Column } from '$lib/components/columns';
	import Stat from '$lib/components/ui/Stat.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import { fmtPrice, fmtSignedPct, fmtPct, fmtInt } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	const columns: Column<ForwardPosition>[] = [
		{ key: 'symbol', label: 'Symbol', sortable: true, value: (r) => r.symbol, mono: true },
		{ key: 'direction', label: 'Dir', type: 'direction', value: (r) => r.direction },
		{ key: 'entryDate', label: 'Entry', sortable: true, value: (r) => r.entryDate, mono: true },
		{ key: 'entryPrice', label: 'In', align: 'right', mono: true, value: (r) => r.entryPrice, format: (r) => fmtPrice(r.entryPrice) },
		{ key: 'currentPrice', label: 'Now', align: 'right', mono: true, value: (r) => r.currentPrice ?? r.exitPrice, format: (r) => fmtPrice(r.currentPrice ?? r.exitPrice) },
		{ key: 'pnlPct', label: 'P&L %', align: 'right', mono: true, sortable: true, colorBySign: true, value: (r) => r.pnlPct, format: (r) => fmtSignedPct(r.pnlPct) },
		{ key: 'status', label: 'Status', sortable: true, value: (r) => r.status },
		{ key: 'exitReason', label: 'Exit', value: (r) => r.exitReason ?? '—' }
	];
</script>

<header class="mb-5">
	<h1 class="text-2xl font-bold">Forward Test</h1>
	<p class="text-sm text-muted-foreground">Signals tracked live since they fired, marked to current quotes.</p>
</header>

<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
	<Stat label="Tracked" value={fmtInt(data.summary.total)} />
	<Stat label="Open" value={fmtInt(data.summary.open)} />
	<Stat label="Closed" value={fmtInt(data.summary.closed)} />
	<Stat label="Win Rate" value={fmtPct(data.summary.winRate)} sub={`avg ${fmtSignedPct(data.summary.avgPnlPct)}`} />
</div>

{#if data.positions.length === 0}
	<div class="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
		No forward-test positions yet. They accumulate as the scheduled daily job records fresh signals
		and tracks their outcomes (run the worker — see Settings).
	</div>
{:else}
	<DataTable {columns} rows={data.positions} rowKey={(r) => `${r.symbol}-${r.entryDate}-${r.direction}`} onRowClick={(r) => goto(`/symbol/${r.symbol}`)} />
{/if}
