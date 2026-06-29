<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from 'svelte-sonner';
	import Nav from '$lib/components/Nav.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>High-Octane Scanner</title>
	<meta name="description" content="Stacked-MA exhaustion screener, backtester and forward-tester" />
</svelte:head>

<ModeWatcher defaultMode="dark" />
<Toaster richColors position="top-right" theme="dark" />

<div class="flex min-h-screen">
	<aside class="sticky top-0 h-screen w-56 shrink-0 border-r border-border bg-card">
		<Nav />
	</aside>
	<main class="min-w-0 flex-1 px-6 py-6">
		{@render children()}
	</main>
</div>
