<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createChart,
		CandlestickSeries,
		LineSeries,
		createSeriesMarkers,
		ColorType,
		type IChartApi,
		type ISeriesApi,
		type ISeriesMarkersPluginApi,
		type SeriesMarker,
		type Time
	} from 'lightweight-charts';
	import type { Bar, IndicatorRow, Signal } from '@scanner/core';

	let {
		bars,
		indicators = [],
		signals = [],
		height = 460
	}: {
		bars: Bar[];
		indicators?: (IndicatorRow | null)[];
		signals?: Signal[];
		height?: number;
	} = $props();

	const MA_CONFIG = [
		{ key: 'ema5', color: '#f59e0b' },
		{ key: 'ema9', color: '#fb923c' },
		{ key: 'ema21', color: '#facc15' },
		{ key: 'sma50', color: '#3b82f6' },
		{ key: 'sma100', color: '#a855f7' },
		{ key: 'sma200', color: '#ec4899' }
	] as const;

	let container: HTMLDivElement;
	let chart: IChartApi | undefined;
	let candle: ISeriesApi<'Candlestick'> | undefined;
	const maSeries: Partial<Record<string, ISeriesApi<'Line'>>> = {};
	let markers: ISeriesMarkersPluginApi<Time> | undefined;

	function update() {
		if (!candle) return;
		candle.setData(
			bars.map((b) => ({ time: b.date as Time, open: b.open, high: b.high, low: b.low, close: b.close }))
		);
		for (const m of MA_CONFIG) {
			const data: { time: Time; value: number }[] = [];
			for (let i = 0; i < bars.length; i++) {
				const row = indicators[i];
				if (row) data.push({ time: bars[i]!.date as Time, value: row[m.key] });
			}
			maSeries[m.key]?.setData(data);
		}
		const markerData: SeriesMarker<Time>[] = signals
			.filter((s) => s.fresh)
			.map((s) => ({
				time: s.date as Time,
				position: s.direction === 'LONG' ? 'belowBar' : 'aboveBar',
				color: s.direction === 'LONG' ? '#22c55e' : '#ef4444',
				shape: s.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
				text: s.direction[0]
			}));
		if (markers) markers.setMarkers(markerData);
		else markers = createSeriesMarkers(candle, markerData);
		chart?.timeScale().fitContent();
	}

	onMount(() => {
		chart = createChart(container, {
			height,
			autoSize: true,
			layout: {
				background: { type: ColorType.Solid, color: 'transparent' },
				textColor: '#94a3b8',
				fontFamily: 'ui-monospace, monospace'
			},
			grid: {
				vertLines: { color: 'rgba(148,163,184,0.08)' },
				horzLines: { color: 'rgba(148,163,184,0.08)' }
			},
			rightPriceScale: { borderColor: 'rgba(148,163,184,0.2)' },
			timeScale: { borderColor: 'rgba(148,163,184,0.2)', timeVisible: false }
		});
		candle = chart.addSeries(CandlestickSeries, {
			upColor: '#22c55e',
			downColor: '#ef4444',
			wickUpColor: '#22c55e',
			wickDownColor: '#ef4444',
			borderVisible: false
		});
		for (const m of MA_CONFIG) {
			maSeries[m.key] = chart.addSeries(LineSeries, {
				color: m.color,
				lineWidth: 1,
				priceLineVisible: false,
				lastValueVisible: false,
				crosshairMarkerVisible: false
			});
		}
		update();
		return () => {
			chart?.remove();
			chart = undefined;
			candle = undefined;
			markers = undefined;
		};
	});

	// Re-render when inputs change (after the chart exists).
	$effect(() => {
		void bars;
		void indicators;
		void signals;
		if (chart) update();
	});
</script>

<div bind:this={container} style="height:{height}px" class="w-full"></div>

<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
	{#each MA_CONFIG as m (m.key)}
		<span class="inline-flex items-center gap-1">
			<span class="inline-block h-2 w-3 rounded-sm" style="background:{m.color}"></span>
			{m.key.toUpperCase()}
		</span>
	{/each}
</div>
