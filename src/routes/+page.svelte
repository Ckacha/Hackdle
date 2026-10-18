<script lang="ts">
	import { onMount } from 'svelte';
	import {
		programs,
		bySlug,
		compare,
		isWin,
		formatOf,
		logoFor,
		organizers,
		COLUMNS,
		FORMAT_LABEL,
		TYPE_LABEL,
		type Format,
		type Guess,
		type Type
	} from '#lib/game.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let answer = $derived(bySlug.get(data.answer)!);
	let yesterday = $derived(data.yesterday ? bySlug.get(data.yesterday) : undefined);
	let storageKey = $derived(`hackdle:v2:${data.key}`);

	let guesses = $state<Guess[]>([]);
	let gaveUp = $state(false);

	let query = $state('');
	let slug = $state('');
	let start = $state('');
	let end = $state('');
	let format = $state<Format | ''>('');
	let type = $state<Type | ''>('');
	let organizer = $state('');
	let highlighted = $state(0);
	let open = $state(false);

	let results = $derived(guesses.map((g) => compare(g, answer)));
	let won = $derived(results.some(isWin));
	let done = $derived(won || gaveUp);
	let complete = $derived(!!(slug && start && end && format && type && organizer.trim()));

	let suggestions = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q || !open) return [];
		return programs
			.filter((p) => p.name.toLowerCase().includes(q))
			.sort((a, b) => +!a.name.toLowerCase().startsWith(q) - +!b.name.toLowerCase().startsWith(q))
			.slice(0, 8);
	});

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
			guesses = (saved.guesses ?? []).filter((g: Guess) => bySlug.has(g.slug));
			gaveUp = !!saved.gaveUp;
		} catch {}
	});

	function save() {
		try {
			localStorage.setItem(storageKey, JSON.stringify({ guesses, gaveUp }));
		} catch {}
	}

	function pick(i: number) {
		const p = suggestions[i];
		if (!p) return;
		slug = p.slug;
		query = p.name;
		open = false;
	}

	function onQueryInput() {
		slug = '';
		highlighted = 0;
		open = true;
	}

	function onQueryKeydown(e: KeyboardEvent) {
		if (!suggestions.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlighted = Math.min(highlighted + 1, suggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = Math.max(highlighted - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			pick(highlighted);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!complete || done) return;
		guesses = [
			{ slug, start, end, format: format as Format, type: type as Type, organizer: organizer.trim() },
			...guesses
		];
		save();
	}

	function giveUp() {
		gaveUp = true;
		save();
	}
</script>

<svelte:head>
	<title>Hackdle</title>
	<meta name="description" content="Guess today's Hack Club YSWS, field by field." />
</svelte:head>

<main>
	<header>
		<h1>Hackdle</h1>
		<p class="tagline">The daily guessing game for Hack Club programs</p>
	</header>

	{#if done}
		<section class="card result">
			<h2>{won ? 'You got it!' : 'Today’s program was'}</h2>
			<div class="winner">
				{#if logoFor(answer)}<img src={logoFor(answer)} alt="" />{/if}
				<div>
					<strong>{answer.name}</strong>
					{#if answer.description}<p>{answer.description}</p>{/if}
					{#if answer.url}<a href={answer.url} target="_blank" rel="noreferrer">Visit site →</a>{/if}
				</div>
			</div>
			<dl class="facts">
				<div><dt>Start</dt><dd>{answer.start_date}</dd></div>
				<div><dt>End</dt><dd>{answer.end_date}</dd></div>
				<div><dt>Format</dt><dd>{FORMAT_LABEL[formatOf(answer)]}</dd></div>
				<div><dt>Type</dt><dd>{answer.type ? TYPE_LABEL[answer.type] : '?'}</dd></div>
				<div><dt>{answer.organizers.length > 1 ? 'Organizers' : 'Organizer'}</dt><dd>{answer.organizers.join(', ') || 'Unknown'}</dd></div>
			</dl>
			<p class="muted">
				{#if won}Solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}.{/if}
				Come back tomorrow for a new one.
			</p>
		</section>
	{:else}
		<form class="card guess" onsubmit={submit}>
			<h2>Guess today's Hack Club program!</h2>
			<p class="muted">Fill in every field, then guess. Each field tells you if it's right.</p>

			<div class="fields">
				<label class="field wide">
					<span>Program</span>
					<div class="search">
						<input
							type="text"
							placeholder="Type a program name…"
							autocomplete="off"
							spellcheck="false"
							bind:value={query}
							oninput={onQueryInput}
							onkeydown={onQueryKeydown}
							onblur={() => setTimeout(() => (open = false), 150)}
							class:valid={!!slug}
						/>

						{#if suggestions.length}
							<ul class="suggestions" role="listbox">
								{#each suggestions as p, i (p.slug)}
									<li role="option" aria-selected={i === highlighted}>
										<button
											type="button"
											class:active={i === highlighted}
											onmouseenter={() => (highlighted = i)}
											onmousedown={(e) => e.preventDefault()}
											onclick={() => pick(i)}
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
				</label>

				<label class="field">
					<span>Start</span>
					<input type="month" min="2018-01" max="2027-12" bind:value={start} />
				</label>

				<label class="field">
					<span>End</span>
					<input type="month" min="2018-01" max="2027-12" bind:value={end} />
				</label>

				<fieldset class="field">
					<legend>Format</legend>
					<div class="choices">
						{#each Object.entries(FORMAT_LABEL) as [value, label]}
							<button type="button" class:on={format === value} onclick={() => (format = value as Format)}
								>{label}</button
							>
						{/each}
					</div>
				</fieldset>

				<fieldset class="field">
					<legend>Type</legend>
					<div class="choices">
						{#each Object.entries(TYPE_LABEL) as [value, label]}
							<button type="button" class:on={type === value} onclick={() => (type = value as Type)}>{label}</button>
						{/each}
					</div>
				</fieldset>

				<label class="field wide">
					<span>Organizer</span>
					<input
						type="text"
						placeholder="Who ran it? Any organizer counts"
						autocomplete="off"
						spellcheck="false"
						list="organizers"
						bind:value={organizer}
					/>
					
					<datalist id="organizers">
						{#each organizers as o}<option value={o}></option>{/each}
					</datalist>
				</label>
			</div>

			<div class="actions">
				<button class="submit" type="submit" disabled={!complete}>Guess</button>
				{#if guesses.length >= 3}
					<button class="link" type="button" onclick={giveUp}>Give up</button>
				{/if}
			</div>
		</form>
	{/if}

	{#if guesses.length}
		<section class="board" aria-label="Guesses">
			<div class="row head">
				{#each COLUMNS as c}<div>{c}</div>{/each}
			</div>
			{#each guesses as g, n (guesses.length - n)}
				{@const p = bySlug.get(g.slug)}
				<div class="row">
					{#each results[n] as cell, i}
						<div class="tile {cell.verdict}" style="animation-delay: {i * 150}ms">
							{#if i === 0 && p && logoFor(p)}<img src={logoFor(p)} alt="" />{/if}
							<span class:name={i === 0}>{cell.label}</span>
							{#if cell.arrow}
							<span class="arrow" aria-label={cell.arrow === 'up' ? 'later' : 'earlier'}>{cell.arrow === 'up' ? '▲' : '▼'}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</section>

		<section class="card legend">
			<span><i class="correct"></i>Correct</span>
			<span><i class="wrong"></i>Wrong</span>
			<span>▲▼ The real date is later / earlier</span>
		</section>
	{/if}

	{#if yesterday}
		<p class="yesterday">Yesterday's program was <strong>{yesterday.name}</strong></p>
	{/if}
</main>

<footer>
	Made with &lt;3 by a Hack Clubber
</footer>

<style>
	main {
		max-width: 920px;
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
		max-width: 680px;
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

	.fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px 16px;
		margin-top: 20px;
		text-align: left;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		margin: 0;
		padding: 0;
		border: none;
	}

	.field.wide {
		grid-column: 1 / -1;
	}

	.field > span,
	.field > legend {
		padding: 0;
		font-weight: bold;
		font-size: 15px;
	}

	input {
		width: 100%;
		font: inherit;
		font-size: 17px;
		padding: 10px 14px;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		color: var(--foreground);
		outline: none;
		transition: border-color 0.2s;
	}

	input:focus {
		border-color: var(--red);
	}

	input.valid {
		border-color: var(--green);
	}

	.choices {
		display: flex;
		gap: 6px;
	}

	.choices button {
		flex: 1;
		padding: 10px 6px;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		font: inherit;
		font-size: 15px;
		color: var(--foreground);
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.choices button:hover {
		background: var(--surface-hover);
	}

	.choices button.on {
		background: var(--red);
		border-color: var(--red);
		color: white;
		font-weight: bold;
	}

	.search {
		position: relative;
	}

	.suggestions {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 10;
		margin: 0;
		padding: 6px;
		list-style: none;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: var(--shadow-dd);
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

	.actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin-top: 20px;
	}

	.submit {
		padding: 12px 40px;
		border: none;
		border-radius: 999px;
		background: var(--red);
		color: white;
		font: inherit;
		font-size: 18px;
		font-weight: bold;
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

	.link {
		border: none;
		background: none;
		font: inherit;
		color: var(--red-text);
		cursor: pointer;
		text-decoration: underline;
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

	.facts {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px 20px;
		margin: 0 0 16px;
	}

	.facts dt {
		font-size: 13px;
		color: var(--muted);
	}

	.facts dd {
		margin: 0;
		font-weight: bold;
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
		grid-template-columns: minmax(120px, 1.5fr) repeat(4, minmax(96px, 1fr)) minmax(120px, 1.3fr);
		gap: 8px;
		min-width: 720px;
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
		overflow-wrap: anywhere;
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

	@media (max-width: 560px) {
		.fields {
			grid-template-columns: 1fr;
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
</style>
