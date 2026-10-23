<script lang="ts">
	import { formatOf, isOngoing, logoFor, monthLabel, FORMAT_LABEL, TYPE_LABEL, type Program } from '#lib/program.ts';
	import Organizers from '#lib/Organizers.svelte';
	import Undefined from '#lib/Undefined.svelte';
	import './program-card.css';

	let { p }: { p: Program } = $props();
	const month = (d: string) => monthLabel(d.slice(0, 7));
</script>

<div class="program">
	<div class="program-top">
		{#if logoFor(p)}
			<img src={logoFor(p)} alt="" loading="lazy" />
		{:else}
			<span class="ph">{(p.name[0] ?? '?').toUpperCase()}</span>
		{/if}

		<div>
			<h2>
				{#if p.url}<a href={p.url} target="_blank" rel="noreferrer">{p.name}</a>{:else}{p.name}{/if}
			</h2>
			<p class="program-dates">
				{#if p.start_date && p.end_date}
					{month(p.start_date)} to {month(p.end_date)}
				{:else if p.start_date && isOngoing(p)}
					{month(p.start_date)} to now, still ongoing
				{:else if p.start_date}
					Started {month(p.start_date)}. End: <Undefined which="end" />
				{:else if p.end_date}
					Ended {month(p.end_date)}. Start: <Undefined which="start" />
				{:else}
					<Undefined />
				{/if}
			</p>
		</div>
	</div>

	{#if p.description}
		<p class="program-desc">{p.description}</p>
	{/if}

	<div class="tags">
		<span>{formatOf(p) === 'both' ? 'Online + In person' : FORMAT_LABEL[formatOf(p)]}</span>
		{#if p.type}<span>{TYPE_LABEL[p.type]}</span>{/if}
		{#if p.status === 'cancelled'}<span class="cancelled">Cancelled</span>{/if}
	</div>

	<p class="program-org">
		<strong>{p.organizers.length > 1 ? 'Organizers' : 'Organizer'}</strong>
		<Organizers names={p.organizers} />
	</p>
</div>
