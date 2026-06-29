<script lang="ts">
	import { browser } from '$app/environment';
	import { Canvas, T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';

	export interface SectorDatum {
		sector: string;
		count: number;
		/** Long/short balance in [-1, 1]; +1 all-long, -1 all-short. */
		net: number;
	}

	let { data, height = 340 }: { data: SectorDatum[]; height?: number } = $props();

	const maxCount = $derived(Math.max(1, ...data.map((d) => d.count)));
	const cols = $derived(Math.max(1, Math.ceil(Math.sqrt(data.length || 1))));
	const rows = $derived(Math.max(1, Math.ceil((data.length || 1) / cols)));

	function tilePos(i: number): [number, number] {
		const c = i % cols;
		const r = Math.floor(i / cols);
		return [c * 1.6 - (cols - 1) * 0.8, r * 1.6 - (rows - 1) * 0.8];
	}
	function barHeight(count: number): number {
		return 0.3 + (count / maxCount) * 4;
	}
	function color(net: number): string {
		return net >= 0 ? `hsl(142 65% ${40 + net * 18}%)` : `hsl(0 72% ${46 + -net * 12}%)`;
	}
</script>

<div class="overflow-hidden rounded-lg border border-border bg-card" style="height:{height}px">
	{#if browser && data.length > 0}
		<Canvas>
			<T.PerspectiveCamera makeDefault position={[7, 8, 10]} fov={48}>
				<OrbitControls enableDamping autoRotate autoRotateSpeed={0.5} target={[0, 1.2, 0]} />
			</T.PerspectiveCamera>
			<T.AmbientLight intensity={0.7} />
			<T.DirectionalLight position={[6, 12, 8]} intensity={1.3} />
			<T.GridHelper args={[24, 24, '#334155', '#1e293b']} />
			{#each data as d, i (d.sector)}
				{@const h = barHeight(d.count)}
				{@const p = tilePos(i)}
				<T.Mesh position={[p[0], h / 2, p[1]]} castShadow>
					<T.BoxGeometry args={[1.15, h, 1.15]} />
					<T.MeshStandardMaterial color={color(d.net)} metalness={0.1} roughness={0.6} />
				</T.Mesh>
			{/each}
		</Canvas>
	{:else}
		<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
			{data.length === 0 ? 'No signals to map' : 'Loading 3D view…'}
		</div>
	{/if}
</div>

{#if data.length > 0}
	<div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
		{#each data as d (d.sector)}
			<span class="inline-flex items-center gap-1">
				<span class="inline-block h-2 w-2 rounded-sm" style="background:{color(d.net)}"></span>
				{d.sector} ({d.count})
			</span>
		{/each}
	</div>
{/if}
