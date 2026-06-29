<script lang="ts">
	import { cn } from '$lib/utils/cn';

	let {
		label,
		value,
		sub,
		valueClass = ''
	}: { label: string; value: string; sub?: string; valueClass?: string } = $props();
</script>

<div class="rounded-lg border border-border bg-card px-4 py-3">
	<div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
	<div class={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', valueClass)}>{value}</div>
	{#if sub}
		<div class="mt-0.5 text-xs text-muted-foreground">{sub}</div>
	{/if}
</div>
