<script lang="ts">
	import { programs, formatOf, isOngoing, logoFor, monthLabel, FORMAT_LABEL, TYPE_LABEL } from '#lib/game.ts';
	import Organizers from '#lib/Organizers.svelte';
	import Undefined from '#lib/Undefined.svelte';
	import './list.css';

	let query = $state('');

	const sorted = [...programs].sort((a, b) => a.name.localeCompare(b.name));

	let shown = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return sorted;
		return sorted.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.organizers.some((o) => o.toLowerCase().includes(q)) ||
				(p.description ?? '').toLowerCase().includes(q)
		);
	});

	const month = (d: string) => monthLabel(d.slice(0, 7));
</script>

<svelte:head>
	<title>Master List · Hackdle</title>
	<meta name="description" content="Every Hack Club program in Hackdle." />
</svelte:head>

<main>
	<header>
		<h1>Master List</h1>
		<p class="tagline">Every program that Hack Club has ever ran! (might have some incorrect info, if so please dm @Iamalive on slack!)</p>
	</header>

	<div class="list-search">
		<input type="search" placeholder="Search by name, organizer or description…" autocomplete="off" spellcheck="false" bind:value={query} />
		<p class="muted">{shown.length} of {programs.length} programs</p>
	</div>

	{#if shown.length}
		<ul class="programs">
			{#each shown as p (p.slug)}
				<li class="program">
					<div class="program-top">
						{#if logoFor(p)}
							<img src={logoFor(p)} alt="" loading="lazy" />
						{:else}
							<span class="ph">{p.name[0].toUpperCase()}</span>
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

					{#if p.description}<p class="program-desc">{p.description}</p>{/if}

					<div class="tags">
						<span>{formatOf(p) === 'both' ? 'Online + In person' : FORMAT_LABEL[formatOf(p)]}</span>
						{#if p.type}<span>{TYPE_LABEL[p.type]}</span>{/if}
						{#if p.status === 'cancelled'}<span class="cancelled">Cancelled</span>{/if}
					</div>

					<p class="program-org">
						<strong>{p.organizers.length > 1 ? 'Organizers' : 'Organizer'}</strong>
						<Organizers names={p.organizers} />
					</p>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">Nothing matches “{query}”.</p>
	{/if}
</main>
