<script lang="ts">
	import { onMount } from 'svelte';
	import { programs, compare, logoFor, COLUMNS, type Program } from '#lib/game.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const bySlug = new Map(programs.map((p) => [p.slug, p]));
	let answer = $derived(bySlug.get(data.answer)!);
	let yesterday = $derived(data.yesterday ? bySlug.get(data.yesterday) : undefined);
	let storageKey = $derived(`hackdle:${data.key}`);

	let guesses = $state<Program[]>([]);
	let query = $state('');
	let highlighted = $state(0);
	let won = $derived(guesses.some((g) => g.slug === answer.slug));

	let suggestions = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		const used = new Set(guesses.map((g) => g.slug));
		return programs
			.filter((p) => !used.has(p.slug) && p.name.toLowerCase().includes(q))
			.sort((a, b) => +!a.name.toLowerCase().startsWith(q) - +!b.name.toLowerCase().startsWith(q))
			.slice(0, 8);
	});

	onMount(() => {
		try {
			const saved: string[] = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
			guesses = saved.map((s) => bySlug.get(s)).filter((p): p is Program => !!p);
		} catch {}
	});

	function guess(p: Program) {
		if (won || guesses.some((g) => g.slug === p.slug)) return;
		guesses = [p, ...guesses];
		query = '';
		highlighted = 0;
		try {
			localStorage.setItem(storageKey, JSON.stringify(guesses.map((g) => g.slug)));
		} catch {}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlighted = Math.min(highlighted + 1, suggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = Math.max(highlighted - 1, 0);
		} else if (e.key === 'Enter' && suggestions[highlighted]) {
			e.preventDefault();
			guess(suggestions[highlighted]);
		}
	}
</script>

<svelte:head>
	<title>Hackdle</title>
	<meta name="description" content="Guess today's Hack Club YSWS or hackathon." />
</svelte:head>

<main>
	<header>
		<h1>Hackdle</h1>
		<p class="tagline">The daily guessing game for Hack Club programs</p>
	</header>

	<section class="card prompt">
		{#if won}
			<h2>You got it!</h2>
			<div class="winner">
				{#if logoFor(answer)}<img src={logoFor(answer)} alt="" />{/if}
				<div>
					<strong>{answer.name}</strong>
					{#if answer.description}<p>{answer.description}</p>{/if}
					{#if answer.url}<a href={answer.url} target="_blank" rel="noreferrer">Visit site →</a>{/if}
				</div>
			</div>
			<p class="muted">
				Solved in {guesses.length}
				{guesses.length === 1 ? 'guess' : 'guesses'}. Come back tomorrow for a new one.
			</p>
		{:else}
			<h2>Guess today's Hack Club program!</h2>
			<p class="muted">Type any YSWS or hackathon to begin.</p>
			<div class="search">
				<input
					type="text"
					placeholder="Type a program name…"
					autocomplete="off"
					spellcheck="false"
					aria-label="Program name"
					bind:value={query}
					oninput={() => (highlighted = 0)}
					onkeydown={onKeydown}
				/>
				<button
					class="submit"
					aria-label="Submit guess"
					disabled={!suggestions.length}
					onclick={() => suggestions[highlighted] && guess(suggestions[highlighted])}>➤</button
				>
				{#if suggestions.length}
					<ul class="suggestions" role="listbox">
						{#each suggestions as p, i (p.slug)}
							<li role="option" aria-selected={i === highlighted}>
								<button
									class:active={i === highlighted}
									onmouseenter={() => (highlighted = i)}
									onclick={() => guess(p)}
								>
									{#if logoFor(p)}<img src={logoFor(p)} alt="" loading="lazy" />{:else}<span
											class="ph">{p.name[0]}</span
										>{/if}
									{p.name}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</section>

	{#if guesses.length}
		<section class="board" aria-label="Guesses">
			<div class="row head">
				{#each COLUMNS as c}<div>{c}</div>{/each}
			</div>
			{#each guesses as g (g.slug)}
				<div class="row">
					{#each compare(g, answer) as cell, i}
						<div class="tile {cell.verdict}" style="animation-delay: {i * 180}ms">
							{#if i === 0}
								{#if logoFor(g)}<img src={logoFor(g)} alt="" />{/if}
								<span class="name">{cell.label}</span>
							{:else}
								<span>{cell.label}</span>
								{#if cell.arrow}<span class="arrow" aria-label={cell.arrow === 'up' ? 'later' : 'earlier'}
										>{cell.arrow === 'up' ? '▲' : '▼'}</span
									>{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</section>

		<section class="card legend">
			<span><i class="correct"></i>Correct</span>
			<span><i class="partial"></i>Partial</span>
			<span><i class="wrong"></i>Wrong</span>
			<span>▲▼ Answer's year is later / earlier</span>
		</section>
	{/if}

	{#if yesterday}
		<p class="yesterday">Yesterday's program was <strong>{yesterday.name}</strong></p>
	{/if}
</main>

<footer>
	Not affiliated with Hack Club. Data from <a href="https://ysws.hackclub.com">ysws.hackclub.com</a>.
</footer>

<style>
	main {
		max-width: 760px;
		margin: 0 auto;
		padding: 48px 16px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	header {
		text-align: center;
	}

	h1 {
		margin: 0;
		font-size: clamp(56px, 12vw, 96px);
		font-weight: bold;
		line-height: 1;
		color: var(--red);
		letter-spacing: -0.02em;
		text-shadow: 0 4px 0 rgba(23, 23, 29, 0.12);
	}

	.tagline {
		margin: 8px 0 0;
		font-size: 18px;
		color: var(--muted);
	}

	.card {
		width: 100%;
		max-width: 520px;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: var(--shadow-dd);
		padding: 24px;
		text-align: center;
	}

	h2 {
		margin: 0 0 4px;
		font-size: 24px;
	}

	.muted {
		margin: 0;
		color: var(--muted);
	}

	.search {
		position: relative;
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}

	input {
		flex: 1;
		min-width: 0;
		font: inherit;
		font-size: 18px;
		padding: 12px 16px;
		border: 2px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		color: var(--foreground);
		outline: none;
		transition: border-color 0.2s;
	}

	input:focus {
		border-color: var(--red);
	}

	.submit {
		width: 52px;
		border: none;
		border-radius: 999px;
		background: var(--red);
		color: white;
		font-size: 20px;
		cursor: pointer;
		transition: filter 0.2s;
	}

	.submit:hover:not(:disabled) {
		filter: brightness(1.15);
	}

	.submit:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.suggestions {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 60px;
		z-index: 10;
		margin: 0;
		padding: 6px;
		list-style: none;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: var(--shadow-dd);
		text-align: left;
	}

	.suggestions button {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		border-radius: 8px;
		background: none;
		font: inherit;
		font-size: 16px;
		color: var(--foreground);
		cursor: pointer;
		text-align: left;
	}

	.suggestions button.active {
		background: var(--surface-hover);
	}

	.suggestions img,
	.ph {
		width: 32px;
		height: 32px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.ph {
		display: grid;
		place-items: center;
		border-radius: 8px;
		background: var(--surface-hover);
		font-weight: bold;
		color: var(--muted);
	}

	.winner {
		display: flex;
		align-items: center;
		gap: 16px;
		margin: 16px 0;
		text-align: left;
	}

	.winner img {
		width: 88px;
		height: 88px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.winner strong {
		font-size: 22px;
	}

	.winner p {
		margin: 4px 0;
		color: var(--muted);
	}

	.winner a {
		color: var(--red-text);
		font-weight: bold;
		text-decoration: none;
	}

	.board {
		width: 100%;
		overflow-x: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-bottom: 4px;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(120px, 1.6fr) repeat(4, minmax(88px, 1fr));
		gap: 8px;
		min-width: 560px;
	}

	.row.head div {
		padding-bottom: 4px;
		border-bottom: 3px solid var(--foreground);
		text-align: center;
		font-weight: bold;
	}

	.tile {
		min-height: 84px;
		padding: 8px;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		text-align: center;
		font-weight: bold;
		color: white;
		border: 2px solid rgba(0, 0, 0, 0.12);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
		animation: flip 0.5s ease both;
	}

	.tile img {
		width: 44px;
		height: 44px;
		object-fit: contain;
		background: white;
		border-radius: 8px;
		padding: 2px;
	}

	.tile .name {
		font-size: 14px;
		line-height: 1.15;
	}

	.arrow {
		font-size: 18px;
		opacity: 0.85;
	}

	.correct {
		background: var(--green);
	}

	.partial {
		background: var(--orange);
	}

	.wrong {
		background: var(--red);
	}

	@keyframes flip {
		from {
			transform: rotateX(90deg);
			opacity: 0;
		}
		to {
			transform: rotateX(0);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tile {
			animation: none;
		}
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px 20px;
		padding: 14px 20px;
		font-size: 15px;
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.legend i {
		width: 14px;
		height: 14px;
		border-radius: 4px;
	}

	.yesterday {
		margin: 0;
		padding: 8px 16px;
		border-radius: 999px;
		background: var(--background);
		box-shadow: var(--shadow-dd);
		color: var(--muted);
	}

	footer {
		padding: 24px 16px 40px;
		text-align: center;
		font-size: 14px;
		color: var(--muted);
	}

	footer a {
		color: var(--red-text);
	}
</style>
