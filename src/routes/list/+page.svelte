<script lang="ts">
	import { programs, formatOf, logoFor, monthLabel, FORMAT_LABEL, TYPE_LABEL, type Program } from '#lib/game.ts';
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

	const month = (d: string | null) => (d ? monthLabel(d.slice(0, 7)) : '?');

	function dates(p: Program) {
		if (!p.start_date && !p.end_date) return 'Dates unknown';
		return `${month(p.start_date)} to ${month(p.end_date)}`;
	}
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
							<p class="program-dates">{dates(p)}</p>
						</div>
					</div>

					{#if p.description}<p class="program-desc">{p.description}</p>{/if}

					<div class="tags">
						<span>{formatOf(p) === 'both' ? 'Online + In person' : FORMAT_LABEL[formatOf(p)]}</span>
						{#if p.type}<span>{TYPE_LABEL[p.type]}</span>{/if}
					</div>

					<p class="program-org">
						<strong>{p.organizers.length > 1 ? 'Organizers' : 'Organizer'}</strong>
						{p.organizers.join(', ') || 'Unknown'}
					</p>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">Nothing matches “{query}”.</p>
	{/if}
</main>
