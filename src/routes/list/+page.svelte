<script lang="ts">
	import { programs } from '#lib/game.ts';
	import ProgramCard from '#lib/ProgramCard.svelte';
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
</script>

<svelte:head>
	<title>Catalog · Hackdle</title>
	<meta name="description" content="Every Hack Club program in Hackdle." />
</svelte:head>

<main>
	<header>
		<h1>Catalog</h1>
		<p class="tagline">Every program that Hack Club has ever run! (Some info might be wrong. If so, please DM @Iamalive or go to <a href="https://hackclub.enterprise.slack.com/archives/C0CB25LV0PJ" target="_blank" rel="noreferrer">#hackdle</a> on Slack!)</p>
	</header>

	<div class="list-search">
		<input type="search" placeholder="Search by name, organizer or description…" autocomplete="off" spellcheck="false" bind:value={query} />
		<p class="muted">{shown.length} of {programs.length} programs</p>
	</div>

	{#if shown.length}
		<ul class="programs">
			{#each shown as p (p.slug)}
				<li><ProgramCard {p} /></li>
			{/each}
		</ul>
	{:else}
		<p class="muted">Nothing matches “{query}”.</p>
	{/if}
</main>
