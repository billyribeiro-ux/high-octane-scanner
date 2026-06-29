<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { ArrowsClockwise, FileCsv, FileXls } from 'phosphor-svelte';
	import type { PageData } from './$types';
	import type { SignalListItem } from '@scanner/data';
	import type { Column } from '$lib/components/columns';
	import DataTable from '$lib/components/DataTable.svelte';
	import { api, downloadExport } from '$lib/api/client';
	import { fmtPrice, fmtNumber, fmtCompact } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	let direction = $state<'ALL' | 'LONG' | 'SHORT'>('ALL');
	let sector = $state('ALL');
	let freshOnly = $state(false);
	let search = $state('');
	let scanning = $state(false);

	const filtered = $derived(
		data.signals.filter(
			(r) =>
				(direction === 'ALL' || r.direction === direction) &&
				(sector === 'ALL' || r.sector === sector) &&
				(!freshOnly || r.fresh) &&
				(!search || r.symbol.toLowerCase().includes(search.toLowerCase()))
		)
	);

	const columns: Column<SignalListItem>[] = [
		{ key: 'symbol', label: 'Symbol', sortable: true, value: (r) => r.symbol, mono: true },
		{ key: 'direction', label: 'Signal', type: 'direction', value: (r) => r.direction },
		{ key: 'fresh', label: 'Fresh', value: (r) => (r.fresh ? 'NEW' : '') },
		{ key: 'close', label: 'Close', align: 'right', mono: true, sortable: true, value: (r) => r.close, format: (r) => fmtPrice(r.close) },
		{ key: 'ema5', label: 'EMA5', align: 'right', mono: true, value: (r) => r.ema5, format: (r) => fmtNumber(r.ema5) },
		{ key: 'sma200', label: 'SMA200', align: 'right', mono: true, value: (r) => r.sma200, format: (r) => fmtNumber(r.sma200) },
		{ key: 'sector', label: 'Sector', sortable: true, value: (r) => r.sector ?? '—' },
		{ key: 'marketCap', label: 'Mkt Cap', align: 'right', mono: true, sortable: true, value: (r) => r.marketCap, format: (r) => fmtCompact(r.marketCap) }
	];

	async function runScan() {
		scanning = true;
		try {
			const r = await api.runScan();
			if (r.status === 'busy') toast.info('A scan is already running');
			else toast.success(`Scan complete — ${r.signalsFound ?? 0} signals on ${r.date ?? '—'}`);
			await invalidateAll();
		} catch (e) {
			toast.error(String(e));
		} finally {
			scanning = false;
		}
	}

	async function doExport(kind: 'csv' | 'xlsx') {
		try {
			await downloadExport(kind, { dataset: 'signals', date: data.date ?? undefined });
		} catch (e) {
			toast.error(String(e));
		}
	}
</script>

<header class="mb-5 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="text-2xl font-bold">Scanner</h1>
		<p class="text-sm text-muted-foreground">
			{filtered.length} of {data.total} signals · {data.date ?? 'no scan yet'}
		</p>
	</div>
	<div class="flex gap-2">
		<button onclick={() => doExport('csv')} class="btn-ghost"><FileCsv size={16} /> CSV</button>
		<button onclick={() => doExport('xlsx')} class="btn-ghost"><FileXls size={16} /> Excel</button>
		<button onclick={runScan} disabled={scanning} class="btn-primary">
			<ArrowsClockwise size={16} class={scanning ? 'animate-spin' : ''} />
			{scanning ? 'Scanning…' : 'Run Scan'}
		</button>
	</div>
</header>

<div class="mb-4 flex flex-wrap items-end gap-3">
	<label class="text-xs font-medium text-muted-foreground">
		Direction
		<select bind:value={direction} class="filter">
			<option value="ALL">All</option>
			<option value="LONG">Long</option>
			<option value="SHORT">Short</option>
		</select>
	</label>
	<label class="text-xs font-medium text-muted-foreground">
		Sector
		<select bind:value={sector} class="filter">
			<option value="ALL">All sectors</option>
			{#each data.sectors as s (s)}<option value={s}>{s}</option>{/each}
		</select>
	</label>
	<label class="text-xs font-medium text-muted-foreground">
		Search
		<input bind:value={search} placeholder="Ticker…" class="filter" />
	</label>
	<label class="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" bind:checked={freshOnly} /> Fresh only</label>
</div>

<DataTable {columns} rows={filtered} rowKey={(r) => `${r.symbol}-${r.direction}`} onRowClick={(r) => goto(`/symbol/${r.symbol}`)} emptyMessage="No matching signals" />

<style>
	.filter {
		margin-top: 0.25rem;
		display: block;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--input));
		background: hsl(var(--background));
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
		color: hsl(var(--foreground));
	}
	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: 0.5rem;
		background: hsl(var(--primary));
		padding: 0.45rem 0.9rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: hsl(var(--primary-foreground));
	}
	.btn-primary:disabled {
		opacity: 0.5;
	}
	.btn-ghost {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
		padding: 0.45rem 0.8rem;
		font-size: 0.85rem;
		color: hsl(var(--foreground));
	}
	.btn-ghost:hover {
		background: hsl(var(--accent));
	}
</style>
