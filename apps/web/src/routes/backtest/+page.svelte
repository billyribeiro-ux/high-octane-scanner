<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { FileCsv, FileXls } from 'phosphor-svelte';
	import type { PageData } from './$types';
	import type { BacktestConfig, Trade } from '@scanner/core';
	import type { Column } from '$lib/components/columns';
	import Card from '$lib/components/ui/Card.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import MetricsGrid from '$lib/components/MetricsGrid.svelte';
	import BacktestForm from '$lib/components/BacktestForm.svelte';
	import CandlestickChart from '$lib/components/charts/CandlestickChart.svelte';
	import PerfChart from '$lib/components/charts/PerfChart.svelte';
	import {
		api,
		downloadExport,
		type SingleBacktestResponse,
		type PortfolioJobResult,
		type PerSymbolResult,
		type SymbolChart
	} from '$lib/api/client';
	import { fmtPrice, fmtPct, fmtSignedPct, fmtNumber } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	let mode = $state<'single' | 'portfolio'>('single');
	let symbol = $state(untrack(() => data.preset || data.symbols[0] || 'AAPL'));
	let running = $state(false);

	let single = $state<SingleBacktestResponse | null>(null);
	let chart = $state<SymbolChart | null>(null);

	let portfolioSymbols = $state('');
	let maxSymbols = $state(25);
	let progress = $state<{ done: number; total: number; phase: string } | null>(null);
	let portfolio = $state<PortfolioJobResult | null>(null);

	const tradeColumns: Column<Trade>[] = [
		{ key: 'symbol', label: 'Sym', value: (t) => t.symbol, mono: true },
		{ key: 'direction', label: 'Dir', type: 'direction', value: (t) => t.direction },
		{ key: 'entryDate', label: 'Entry', sortable: true, value: (t) => t.entryDate, mono: true },
		{ key: 'entryPrice', label: 'In', align: 'right', mono: true, value: (t) => t.entryPrice, format: (t) => fmtPrice(t.entryPrice) },
		{ key: 'exitDate', label: 'Exit', value: (t) => t.exitDate, mono: true },
		{ key: 'exitPrice', label: 'Out', align: 'right', mono: true, value: (t) => t.exitPrice, format: (t) => fmtPrice(t.exitPrice) },
		{ key: 'exitReason', label: 'Reason', value: (t) => t.exitReason },
		{ key: 'barsHeld', label: 'Bars', align: 'right', mono: true, value: (t) => t.barsHeld },
		{ key: 'pnlPct', label: 'P&L %', align: 'right', mono: true, sortable: true, colorBySign: true, value: (t) => t.pnlPct, format: (t) => fmtSignedPct(t.pnlPct) },
		{ key: 'rMultiple', label: 'R', align: 'right', mono: true, sortable: true, colorBySign: true, value: (t) => t.rMultiple, format: (t) => fmtNumber(t.rMultiple) }
	];

	const perSymbolColumns: Column<PerSymbolResult>[] = [
		{ key: 'symbol', label: 'Symbol', sortable: true, value: (r) => r.symbol, mono: true },
		{ key: 'trades', label: 'Trades', align: 'right', mono: true, sortable: true, value: (r) => r.trades },
		{ key: 'ret', label: 'Return', align: 'right', mono: true, sortable: true, colorBySign: true, value: (r) => r.metrics.totalReturnPct, format: (r) => fmtSignedPct(r.metrics.totalReturnPct) },
		{ key: 'win', label: 'Win %', align: 'right', mono: true, sortable: true, value: (r) => r.metrics.winRate, format: (r) => fmtPct(r.metrics.winRate) },
		{ key: 'pf', label: 'PF', align: 'right', mono: true, sortable: true, value: (r) => r.metrics.profitFactor, format: (r) => fmtNumber(r.metrics.profitFactor) },
		{ key: 'dd', label: 'Max DD', align: 'right', mono: true, sortable: true, value: (r) => r.metrics.maxDrawdown, format: (r) => fmtPct(r.metrics.maxDrawdown) }
	];

	function onRun(config: BacktestConfig) {
		if (mode === 'single') void runSingle(config);
		else void runPortfolio(config);
	}

	async function runSingle(config: BacktestConfig) {
		running = true;
		single = null;
		chart = null;
		try {
			const [res, ch] = await Promise.all([
				api.backtest({ symbol: symbol.toUpperCase(), config }),
				api.symbolBars(symbol.toUpperCase(), 500).catch(() => null)
			]);
			single = res;
			chart = ch;
			toast.success(`${res.result.metrics.totalTrades} trades over ${res.bars} bars`);
		} catch (e) {
			toast.error(String(e));
		} finally {
			running = false;
		}
	}

	async function runPortfolio(config: BacktestConfig) {
		running = true;
		portfolio = null;
		progress = { done: 0, total: 0, phase: 'starting' };
		try {
			const syms = portfolioSymbols
				.split(/[,\s]+/)
				.map((s) => s.trim().toUpperCase())
				.filter(Boolean);
			const { runId } = await api.portfolio({
				symbols: syms.length ? syms : undefined,
				maxSymbols,
				config
			});
			const es = new EventSource(`/api/backtest/${runId}/stream`);
			es.addEventListener('progress', (e) => {
				progress = JSON.parse((e as MessageEvent).data).progress;
			});
			es.addEventListener('done', (e) => {
				portfolio = JSON.parse((e as MessageEvent).data).result;
				progress = null;
				running = false;
				es.close();
				toast.success(`Portfolio: ${portfolio?.symbolsTested ?? 0} symbols tested`);
			});
			es.addEventListener('error', () => {
				es.close();
				running = false;
				toast.error('Backtest stream error');
			});
		} catch (e) {
			toast.error(String(e));
			running = false;
		}
	}

	async function exportRun(kind: 'csv' | 'xlsx') {
		if (!single) return;
		try {
			await downloadExport(kind, { dataset: 'backtest', runId: single.runId });
		} catch (e) {
			toast.error(String(e));
		}
	}
</script>

<header class="mb-5">
	<h1 class="text-2xl font-bold">Backtest</h1>
	<p class="text-sm text-muted-foreground">
		Simulate the stacked-MA exhaustion strategy with configurable exits.
	</p>
</header>

<div class="mb-4 inline-flex rounded-lg border border-border p-0.5 text-sm">
	<button class="tab" class:tab-active={mode === 'single'} onclick={() => (mode = 'single')}>Single Symbol</button>
	<button class="tab" class:tab-active={mode === 'portfolio'} onclick={() => (mode = 'portfolio')}>Portfolio</button>
</div>

<div class="grid gap-6 lg:grid-cols-[320px_1fr]">
	<div class="space-y-4">
		<Card title="Configuration">
			{#if mode === 'single'}
				<label class="mb-3 block text-xs font-medium text-muted-foreground">
					Symbol
					<input list="symbols" bind:value={symbol} class="cfg-input" />
					<datalist id="symbols">
						{#each data.symbols as s (s)}<option value={s}></option>{/each}
					</datalist>
				</label>
			{:else}
				<label class="mb-3 block text-xs font-medium text-muted-foreground">
					Symbols (blank = top by market cap)
					<textarea bind:value={portfolioSymbols} rows="2" placeholder="AAPL MSFT NVDA…" class="cfg-input"></textarea>
				</label>
				<label class="mb-3 block text-xs font-medium text-muted-foreground">
					Max symbols
					<input type="number" min="1" max="500" bind:value={maxSymbols} class="cfg-input" />
				</label>
			{/if}
			<BacktestForm {onRun} {running} />
		</Card>
	</div>

	<div class="space-y-6">
		{#if mode === 'single' && single}
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">{symbol.toUpperCase()} · {single.result.trades.length} trades</h2>
				<div class="flex gap-2">
					<button onclick={() => exportRun('csv')} class="btn-ghost"><FileCsv size={15} /> CSV</button>
					<button onclick={() => exportRun('xlsx')} class="btn-ghost"><FileXls size={15} /> Excel</button>
				</div>
			</div>
			<MetricsGrid metrics={single.result.metrics} />
			<div class="grid gap-6 xl:grid-cols-2">
				<Card title="Equity Curve"><PerfChart points={single.result.equityCurve.map((p) => ({ date: p.date, value: p.equity }))} variant="equity" /></Card>
				<Card title="Drawdown"><PerfChart points={single.result.equityCurve.map((p) => ({ date: p.date, value: p.drawdown }))} variant="drawdown" /></Card>
			</div>
			{#if chart}
				<Card title="Price & Signals"><CandlestickChart bars={chart.bars} indicators={chart.indicators} signals={chart.signals} height={420} /></Card>
			{/if}
			<Card title="Trades"><DataTable columns={tradeColumns} rows={single.result.trades} rowKey={(t) => `${t.symbol}-${t.entryDate}-${t.exitDate}`} emptyMessage="No trades" /></Card>
		{:else if mode === 'portfolio' && portfolio}
			<h2 class="text-lg font-semibold">Portfolio · {portfolio.symbolsTested} symbols</h2>
			<MetricsGrid metrics={portfolio.metrics} />
			<Card title="Portfolio Equity"><PerfChart points={portfolio.equityCurve.map((p) => ({ date: p.date, value: p.equity }))} variant="equity" /></Card>
			<Card title="Per-Symbol Breakdown"><DataTable columns={perSymbolColumns} rows={portfolio.perSymbol} rowKey={(r) => r.symbol} /></Card>
		{:else if running && progress}
			<Card title="Running…">
				<div class="py-6">
					<div class="mb-2 text-sm text-muted-foreground">{progress.phase} — {progress.done}/{progress.total}</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div class="h-full bg-primary transition-all" style="width:{progress.total ? (progress.done / progress.total) * 100 : 0}%"></div>
					</div>
				</div>
			</Card>
		{:else}
			<div class="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
				Configure and run a backtest to see results.
			</div>
		{/if}
	</div>
</div>

<style>
	.tab {
		border-radius: 0.4rem;
		padding: 0.35rem 0.9rem;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
	}
	.tab-active {
		background: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
	}
	.cfg-input {
		margin-top: 0.25rem;
		width: 100%;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--input));
		background: hsl(var(--background));
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
		color: hsl(var(--foreground));
		font-family: var(--font-mono);
	}
	.btn-ghost {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
		color: hsl(var(--foreground));
	}
	.btn-ghost:hover {
		background: hsl(var(--accent));
	}
</style>
