<script lang="ts" generics="T">
	import { CaretUp, CaretDown } from 'phosphor-svelte';
	import { cn } from '$lib/utils/cn';
	import type { Column } from './columns';

	let {
		columns,
		rows,
		rowKey,
		onRowClick,
		emptyMessage = 'No data'
	}: {
		columns: Column<T>[];
		rows: T[];
		rowKey: (row: T) => string;
		onRowClick?: (row: T) => void;
		emptyMessage?: string;
	} = $props();

	let sortKey = $state<string | null>(null);
	let sortDir = $state<'asc' | 'desc'>('desc');

	function toggleSort(col: Column<T>) {
		if (!col.sortable) return;
		if (sortKey === col.key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortKey = col.key;
			sortDir = 'desc';
		}
	}

	const sorted = $derived.by(() => {
		if (!sortKey) return rows;
		const col = columns.find((c) => c.key === sortKey);
		if (!col?.value) return rows;
		const dir = sortDir === 'asc' ? 1 : -1;
		return [...rows].sort((a, b) => {
			const av = col.value!(a);
			const bv = col.value!(b);
			if (av == null) return 1;
			if (bv == null) return -1;
			if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
			return String(av).localeCompare(String(bv)) * dir;
		});
	});

	function display(col: Column<T>, row: T): string {
		if (col.format) return col.format(row);
		const v = col.value?.(row);
		return v == null ? '—' : String(v);
	}

	function signClass(col: Column<T>, row: T): string {
		if (!col.colorBySign || !col.value) return '';
		const v = col.value(row);
		if (typeof v !== 'number' || v === 0) return '';
		return v > 0 ? 'text-up' : 'text-down';
	}
	const alignClass = (a?: string) =>
		a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
</script>

<div class="overflow-x-auto rounded-lg border border-border">
	<table class="w-full text-sm">
		<thead class="bg-muted/50 text-muted-foreground">
			<tr>
				{#each columns as col (col.key)}
					<th
						class={cn(
							'px-3 py-2 font-medium whitespace-nowrap select-none',
							alignClass(col.align),
							col.sortable && 'cursor-pointer hover:text-foreground'
						)}
						onclick={() => toggleSort(col)}
					>
						<span class="inline-flex items-center gap-1">
							{col.label}
							{#if sortKey === col.key}
								{#if sortDir === 'asc'}<CaretUp size={11} />{:else}<CaretDown size={11} />{/if}
							{/if}
						</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if sorted.length === 0}
				<tr><td colspan={columns.length} class="px-3 py-8 text-center text-muted-foreground">{emptyMessage}</td></tr>
			{:else}
				{#each sorted as row (rowKey(row))}
					<tr
						class={cn(
							'border-t border-border',
							onRowClick && 'cursor-pointer hover:bg-accent/50'
						)}
						onclick={() => onRowClick?.(row)}
					>
						{#each columns as col (col.key)}
							<td class={cn('px-3 py-2 whitespace-nowrap', alignClass(col.align), col.mono && 'font-mono tabular-nums', signClass(col, row))}>
								{#if col.type === 'direction'}
									{@const dir = String(col.value?.(row) ?? '')}
									<span class={dir === 'LONG' ? 'font-semibold text-up' : 'font-semibold text-down'}>{dir}</span>
								{:else}
									{display(col, row)}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
