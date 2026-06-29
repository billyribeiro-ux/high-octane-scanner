<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	let {
		class: className = '',
		title,
		children
	}: { class?: string; title?: string; children: Snippet } = $props();
</script>

<div class={cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)}>
	{#if title}
		<div class="border-b border-border px-4 py-3 text-sm font-semibold">{title}</div>
	{/if}
	<div class="p-4">
		{@render children()}
	</div>
</div>
