<script lang="ts">
	import type { BacktestConfig } from '@scanner/core';
	import { Play } from 'phosphor-svelte';

	let {
		onRun,
		running = false
	}: { onRun: (config: BacktestConfig) => void; running?: boolean } = $props();

	// UI model (percent-friendly); converted to a BacktestConfig on run.
	let stopLossPct = $state(8);
	let takeProfitType = $state<'R' | 'PCT'>('R');
	let takeProfitValue = $state(2);
	let maxHoldBars = $state(20);
	let exitOnOppositeSignal = $state(true);
	let exitOnStackBreak = $state(true);
	let initialEquity = $state(10_000);
	let positionSizePct = $state(100);
	let feesPct = $state(0.05);
	let invert = $state(false);

	function build(): BacktestConfig {
		return {
			signal: { invert, closesRequired: 5, source: 'close' },
			exit: {
				stopLossPct: stopLossPct / 100,
				takeProfit:
					takeProfitType === 'R'
						? { type: 'R', value: takeProfitValue }
						: { type: 'PCT', value: takeProfitValue / 100 },
				maxHoldBars,
				exitOnOppositeSignal,
				exitOnStackBreak
			},
			initialEquity,
			positionSizePct: positionSizePct / 100,
			feesPct: feesPct / 100,
			slippagePct: 0,
			riskFreeRate: 0
		};
	}
</script>

<form
	class="space-y-4"
	onsubmit={(e) => {
		e.preventDefault();
		onRun(build());
	}}
>
	<div class="grid grid-cols-2 gap-3">
		<label class="text-xs font-medium text-muted-foreground">
			Stop Loss (%)
			<input type="number" step="any" min="0" bind:value={stopLossPct} class="input" />
		</label>
		<label class="text-xs font-medium text-muted-foreground">
			Max Hold (bars)
			<input type="number" step="1" min="1" bind:value={maxHoldBars} class="input" />
		</label>
		<label class="text-xs font-medium text-muted-foreground">
			Take Profit
			<select bind:value={takeProfitType} class="input">
				<option value="R">R multiple</option>
				<option value="PCT">Percent</option>
			</select>
		</label>
		<label class="text-xs font-medium text-muted-foreground">
			TP value {takeProfitType === 'PCT' ? '(%)' : '(R)'}
			<input type="number" step="any" min="0" bind:value={takeProfitValue} class="input" />
		</label>
		<label class="text-xs font-medium text-muted-foreground">
			Initial Equity ($)
			<input type="number" step="any" min="100" bind:value={initialEquity} class="input" />
		</label>
		<label class="text-xs font-medium text-muted-foreground">
			Position Size (%)
			<input type="number" step="any" min="1" max="100" bind:value={positionSizePct} class="input" />
		</label>
		<label class="text-xs font-medium text-muted-foreground">
			Fees / side (%)
			<input type="number" step="any" min="0" bind:value={feesPct} class="input" />
		</label>
	</div>

	<div class="space-y-2 text-sm">
		<label class="flex items-center gap-2"><input type="checkbox" bind:checked={exitOnOppositeSignal} /> Exit on opposite signal</label>
		<label class="flex items-center gap-2"><input type="checkbox" bind:checked={exitOnStackBreak} /> Exit on stack break</label>
		<label class="flex items-center gap-2"><input type="checkbox" bind:checked={invert} /> Invert signal direction</label>
	</div>

	<button
		type="submit"
		disabled={running}
		class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
	>
		<Play size={16} weight="fill" />
		{running ? 'Running…' : 'Run Backtest'}
	</button>
</form>

<style>
	.input {
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
	.input:focus {
		outline: 2px solid hsl(var(--ring));
		outline-offset: -1px;
	}
</style>
