<script lang="ts">
	import type { Metrics } from '@scanner/core';
	import Stat from './ui/Stat.svelte';
	import { fmtNumber, fmtPct, fmtPrice, fmtSignedPct, changeColor } from '$lib/utils/format';

	let { metrics }: { metrics: Metrics } = $props();
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
	<Stat label="Total Return" value={fmtSignedPct(metrics.totalReturnPct)} valueClass={changeColor(metrics.totalReturnPct)} />
	<Stat label="CAGR" value={fmtSignedPct(metrics.cagr)} valueClass={changeColor(metrics.cagr)} />
	<Stat label="Trades" value={fmtNumber(metrics.totalTrades, 0)} sub={`${metrics.wins}W / ${metrics.losses}L`} />
	<Stat label="Win Rate" value={fmtPct(metrics.winRate)} />
	<Stat label="Profit Factor" value={fmtNumber(metrics.profitFactor)} />
	<Stat label="Expectancy" value={fmtSignedPct(metrics.expectancy)} valueClass={changeColor(metrics.expectancy)} />
	<Stat label="Max Drawdown" value={fmtPct(metrics.maxDrawdown)} valueClass="text-down" />
	<Stat label="Sharpe" value={fmtNumber(metrics.sharpe)} />
	<Stat label="Sortino" value={fmtNumber(metrics.sortino)} />
	<Stat label="Exposure" value={fmtPct(metrics.exposure)} />
	<Stat label="Avg Win" value={fmtSignedPct(metrics.avgWin)} valueClass="text-up" />
	<Stat label="Avg Loss" value={fmtSignedPct(metrics.avgLoss)} valueClass="text-down" />
	<Stat label="Final Equity" value={fmtPrice(metrics.finalEquity)} />
</div>
