<script lang="ts">
	import { onMount } from 'svelte';
	import { bySlug, formatOf, isOngoing, logoFor, monthLabel, FORMAT_LABEL, TYPE_LABEL, type Program } from '#lib/game.ts';
	import Organizers from '#lib/Organizers.svelte';
	import type { PageProps } from './$types';
	import './history.css';

	let { data }: PageProps = $props();

	let revealed = $state(false);

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(`hackdle:v2:${data.today}`) ?? '{}');
			revealed = !!saved.gaveUp || (saved.guesses ?? []).some((g: { slug: string }) => g.slug === data.answer);
		} catch (e) {
			console.warn('[hackdle] Could not read saved game for today:', e);
		}
	});

	const dayLabel = (key: string) =>
		new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});

	function dates(p: Program) {
		const start = p.start_date ? monthLabel(p.start_date.slice(0, 7)) : '?';
		const end = p.end_date ? monthLabel(p.end_date.slice(0, 7)) : isOngoing(p) ? 'now' : '?';
		return `${start} to ${end}`;
	}
</script>

<svelte:head>
	<title>History · Hackdle</title>
	<meta name="description" content="Every past Hackdle answer." />
</svelte:head>

<main>
	<header>
		<h1>History</h1>
		<p class="tagline">Every past Hackdle answer, newest first</p>
	</header>

	<ol class="days">
		<li class="card day today">
			<span class="date">Today · {dayLabel(data.today)}</span>
			{#if revealed && bySlug.get(data.answer)}
				{@render program(bySlug.get(data.answer)!)}
			{:else}
				<p class="hidden">Still a secret. <a href="/">Go play</a> to find out!</p>
			{/if}
		</li>

		{#each data.days as d (d.date)}
			{@const p = bySlug.get(d.slug)}
			<li class="card day">
				<span class="date">{dayLabel(d.date)}</span>
				{#if p}
					{@render program(p)}
				{:else}
					<p class="hidden">This program has been removed from Hackdle.</p>
				{/if}
			</li>
		{:else}
			<li class="muted none">No past days yet. Check back tomorrow!</li>
		{/each}
	</ol>
</main>

{#snippet program(p: Program)}
	<div class="program">
		{#if logoFor(p)}<img src={logoFor(p)} class:logo-dark={p.logo_dark} alt="" loading="lazy" />{:else}<span class="ph">{p.name[0]}</span>{/if}
		<div class="info">
			<strong>{#if p.url}<a href={p.url} target="_blank" rel="noreferrer">{p.name}</a>{:else}{p.name}{/if}</strong>
			<span class="meta">{dates(p)} · {FORMAT_LABEL[formatOf(p)]}{#if p.type} · {TYPE_LABEL[p.type]}{/if}</span>
			<span class="meta"><Organizers names={p.organizers} /></span>
		</div>
	</div>
{/snippet}
