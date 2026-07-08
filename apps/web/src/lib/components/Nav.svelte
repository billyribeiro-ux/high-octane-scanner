<script lang="ts">
	import { page } from '$app/state';
	import { toggleMode } from 'mode-watcher';
	import { House, Pulse, Funnel, ChartLineUp, Broadcast, Gear, MoonStars, Lightning } from 'phosphor-svelte';

	const links = [
		{ href: '/', label: 'Dashboard', icon: House },
		{ href: '/scanner', label: 'Scanner', icon: Pulse },
		{ href: '/screener', label: 'Screener', icon: Funnel },
		{ href: '/backtest', label: 'Backtest', icon: ChartLineUp },
		{ href: '/forward-test', label: 'Forward Test', icon: Broadcast },
		{ href: '/settings', label: 'Settings', icon: Gear }
	];

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<nav class="flex h-full flex-col gap-1 p-3">
	<a href="/" class="mb-4 flex items-center gap-2 px-2 py-1">
		<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
			<Lightning size={18} weight="fill" />
		</span>
		<span class="text-sm font-bold leading-tight">High-Octane<br /><span class="text-muted-foreground">Scanner</span></span>
	</a>

	{#each links as link (link.href)}
		{@const Icon = link.icon}
		<a
			href={link.href}
			class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
			class:bg-accent={isActive(link.href)}
			class:text-accent-foreground={isActive(link.href)}
			class:text-muted-foreground={!isActive(link.href)}
			class:hover:bg-accent={!isActive(link.href)}
		>
			<Icon size={18} weight={isActive(link.href) ? 'fill' : 'regular'} />
			{link.label}
		</a>
	{/each}

	<div class="mt-auto">
		<button
			onclick={toggleMode}
			class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
		>
			<MoonStars size={18} />
			Toggle theme
		</button>
	</div>
</nav>
