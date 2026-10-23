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
				<li><ProgramCard {p} /></li>
			{/each}
		</ul>
	{:else}
		<p class="muted">Nothing matches “{query}”.</p>
	{/if}
</main>
