<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { ArrowsClockwise } from 'phosphor-svelte';
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/Card.svelte';
	import Stat from '$lib/components/ui/Stat.svelte';
	import { api } from '$lib/api/client';
	import { fmtInt } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();
	let scanning = $state(false);

	async function runScan() {
		scanning = true;
		try {
			const r = await api.runScan();
			toast.success(`Scan complete — ${r.signalsFound ?? 0} signals`);
			await invalidateAll();
		} catch (e) {
			toast.error(String(e));
		} finally {
			scanning = false;
		}
	}
</script>

<header class="mb-5">
	<h1 class="text-2xl font-bold">Settings &amp; Data</h1>
</header>

<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
	<Stat label="Universe" value={fmtInt(data.universe.symbolCount)} sub="symbols" />
	<Stat label="Last Scan" value={data.meta.lastScanDate ?? '—'} />
	<Stat label="Last EOD Data" value={data.meta.lastEodDate ?? '—'} />
</div>

<div class="grid gap-6 lg:grid-cols-2">
	<Card title="The Strategy">
		<div class="space-y-3 text-sm text-muted-foreground">
			<p>A mean-reversion / exhaustion model on daily bars using EMA(5,9,21) and SMA(50,100,200):</p>
			<ul class="list-disc space-y-1 pl-5">
				<li><span class="font-semibold text-down">SHORT</span> when MAs are stacked bullish (EMA5&gt;EMA9&gt;EMA21&gt;SMA50&gt;SMA100&gt;SMA200) and the last 5 closes are all above EMA5.</li>
				<li><span class="font-semibold text-up">LONG</span> when MAs are stacked bearish (EMA5&lt;EMA9&lt;EMA21&lt;SMA50&lt;SMA100&lt;SMA200) and the last 5 closes are all below EMA5.</li>
			</ul>
			<p>The backtester adds configurable exits: stop-loss, take-profit (R or %), max-hold, exit-on-opposite-signal and exit-on-stack-break.</p>
		</div>
	</Card>

	<Card title="Data Operations">
		<div class="space-y-4 text-sm">
			<div>
				<button onclick={runScan} disabled={scanning} class="btn-primary">
					<ArrowsClockwise size={16} class={scanning ? 'animate-spin' : ''} />
					{scanning ? 'Scanning…' : 'Run Scan Now'}
				</button>
				<p class="mt-1 text-xs text-muted-foreground">Recomputes signals from cached bars (no API calls).</p>
			</div>
			<div class="space-y-1 text-muted-foreground">
				<p class="font-medium text-foreground">Populate &amp; update data (CLI, run while the server is stopped):</p>
				<pre class="overflow-x-auto rounded-lg bg-muted p-3 text-xs"><code>pnpm db:migrate
pnpm --filter @scanner/worker universe   # build US universe from FMP
pnpm seed -- AAPL MSFT NVDA               # or backfill specific symbols
pnpm scan:now                             # compute signals
pnpm job:now                              # daily update + scan + forward test
pnpm worker:dev                           # run the scheduler (cron)</code></pre>
				<p class="text-xs">DuckDB is single-writer: stop the dev server before running the worker scripts.</p>
			</div>
		</div>
	</Card>
</div>

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
	.btn-primary:disabled {
		opacity: 0.5;
	}
</style>
