<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Funnel } from 'phosphor-svelte';
	import type { PageData } from './$types';
	import type { SymbolRow } from '@scanner/data';
	import type { Column } from '$lib/components/columns';
	import DataTable from '$lib/components/DataTable.svelte';
	import { api } from '$lib/api/client';
	import { fmtPrice, fmtCompact, fmtInt } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	let rows = $state<SymbolRow[]>(untrack(() => data.initial.rows));
	let total = $state(untrack(() => data.initial.total));
	let loading = $state(false);

	let priceMin = $state<number | null>(null);
	let marketCapMin = $state<number | null>(null);
	let volumeMin = $state<number | null>(null);
	let sector = $state('');
	let exchange = $state('');
	let isEtf = $state<'ALL' | 'YES' | 'NO'>('ALL');
	let search = $state('');

	async function applyFilters() {
		loading = true;
		try {
			const res = await api.screen({
				priceMin: priceMin ?? undefined,
				marketCapMin: marketCapMin ? marketCapMin * 1_000_000 : undefined,
				volumeMin: volumeMin ?? undefined,
				sectors: sector ? [sector] : undefined,
				exchanges: exchange ? [exchange] : undefined,
				isEtf: isEtf === 'ALL' ? undefined : isEtf === 'YES',
				search: search || undefined,
				sort: 'marketCap',
				dir: 'desc',
				limit: 500
			});
			rows = res.rows;
			total = res.total;
		} catch (e) {
			toast.error(String(e));
		} finally {
			loading = false;
		}
	}

	const columns: Column<SymbolRow>[] = [
		{ key: 'symbol', label: 'Symbol', sortable: true, value: (r) => r.symbol, mono: true },
		{ key: 'name', label: 'Name', value: (r) => r.name ?? '—' },
		{ key: 'sector', label: 'Sector', sortable: true, value: (r) => r.sector ?? '—' },
		{ key: 'exchange', label: 'Exch', value: (r) => r.exchange ?? '—' },
		{ key: 'price', label: 'Price', align: 'right', mono: true, sortable: true, value: (r) => r.price, format: (r) => fmtPrice(r.price) },
		{ key: 'marketCap', label: 'Mkt Cap', align: 'right', mono: true, sortable: true, value: (r) => r.marketCap, format: (r) => fmtCompact(r.marketCap) },
		{ key: 'volume', label: 'Volume', align: 'right', mono: true, sortable: true, value: (r) => r.volume, format: (r) => fmtInt(r.volume) },
		{ key: 'isEtf', label: 'Type', value: (r) => (r.isEtf ? 'ETF' : 'Stock') }
	];
</script>

<header class="mb-5">
	<h1 class="text-2xl font-bold">Screener</h1>
	<p class="text-sm text-muted-foreground">{total} matches · {data.universe.symbolCount} in universe</p>
</header>

<form
	class="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
	onsubmit={(e) => {
		e.preventDefault();
		applyFilters();
	}}
>
	<label class="lbl">Min Price<input type="number" step="any" min="0" bind:value={priceMin} class="filter" /></label>
	<label class="lbl">Min Mkt Cap ($M)<input type="number" step="any" min="0" bind:value={marketCapMin} class="filter" /></label>
	<label class="lbl">Min Volume<input type="number" step="any" min="0" bind:value={volumeMin} class="filter" /></label>
	<label class="lbl">Sector
		<select bind:value={sector} class="filter">
			<option value="">Any</option>
			{#each data.universe.sectors as s (s)}<option value={s}>{s}</option>{/each}
		</select>
	</label>
	<label class="lbl">Exchange
		<select bind:value={exchange} class="filter">
			<option value="">Any</option>
			{#each data.universe.exchanges as e (e)}<option value={e}>{e}</option>{/each}
		</select>
	</label>
	<label class="lbl">Type
		<select bind:value={isEtf} class="filter">
			<option value="ALL">All</option>
			<option value="NO">Stocks</option>
			<option value="YES">ETFs</option>
		</select>
	</label>
	<label class="lbl">Search<input bind:value={search} placeholder="Ticker / name" class="filter" /></label>
	<button type="submit" disabled={loading} class="btn-primary"><Funnel size={16} /> {loading ? 'Filtering…' : 'Apply'}</button>
</form>

<DataTable {columns} {rows} rowKey={(r) => r.symbol} onRowClick={(r) => goto(`/symbol/${r.symbol}`)} emptyMessage="No matches — adjust filters or build the universe in Settings" />

<style>
	.lbl {
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: hsl(var(--muted-foreground));
	}
	.filter {
		margin-top: 0.25rem;
		display: block;
		width: 9rem;
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
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: hsl(var(--primary-foreground));
	}
	.btn-primary:disabled {
		opacity: 0.5;
	}
</style>
