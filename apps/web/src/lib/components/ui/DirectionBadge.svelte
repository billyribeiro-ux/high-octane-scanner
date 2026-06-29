<script lang="ts">
	import { TrendUp, TrendDown } from 'phosphor-svelte';
	import { cn } from '$lib/utils/cn';

	let { direction, fresh = false }: { direction: 'LONG' | 'SHORT'; fresh?: boolean } = $props();
	const isLong = $derived(direction === 'LONG');
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
		isLong ? 'bg-up/15 text-up' : 'bg-down/15 text-down'
	)}
>
	{#if isLong}
		<TrendUp size={12} weight="bold" />
	{:else}
		<TrendDown size={12} weight="bold" />
	{/if}
	{direction}
	{#if fresh}
		<span class="ml-0.5 rounded bg-primary/20 px-1 text-[10px] text-primary">NEW</span>
	{/if}
</span>
