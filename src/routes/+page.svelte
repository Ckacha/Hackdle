<script lang="ts">
	import { onMount } from 'svelte';
	import {
		programs,
		answerPool,
		bySlug,
		compare,
		isWin,
		formatOf,
		isOngoing,
		ONGOING,
		logoFor,
		organizers,
		splitOrgs,
		COLUMNS,
		MONTHS,
		FORMAT_LABEL,
		TYPE_LABEL,
		type Format,
		type Guess,
		type Program,
		type Type
	} from '#lib/game.ts';
	import Organizers from '#lib/Organizers.svelte';
	import Undefined from '#lib/Undefined.svelte';
	import type { PageProps } from './$types';
	import './page.css';

	let { data }: PageProps = $props();

	let answer = $derived(bySlug.get(data.answer)!);
	let yesterday = $derived(data.yesterday ? bySlug.get(data.yesterday) : undefined);
	let storageKey = $derived(`hackdle:v2:${data.key}`);

	let guesses = $state<Guess[]>([]);
	let gaveUp = $state(false);

	let query = $state('');
	let slug = $state('');
	let filledFrom = '';
	let startMonth = $state('');
	let startYear = $state('');
	let endMonth = $state('');
	let endYear = $state('');
	let start = $derived(startMonth && startYear ? `${startYear}-${startMonth}` : '');
	let end = $derived(endMonth === ONGOING ? ONGOING : endMonth && endYear ? `${endYear}-${endMonth}` : '');

	const YEARS = Array.from({ length: 10 }, (_, i) => String(2018 + i));
	let format = $state<Format | ''>('');
	let type = $state<Type | ''>('');
	let organizer = $state('');
	let orgOpen = $state(false);
	let orgHighlighted = $state(0);
	let highlighted = $state(0);
	let dialog = $state<HTMLDialogElement>();
	let open = $state(false);

	let results = $derived(guesses.map((g) => compare(g, answer)));
	let won = $derived(results.some(isWin));
	let done = $derived(won || gaveUp);
	let complete = $derived(!!(slug && start && end && format && type && splitOrgs(organizer).length));

	let suggestions = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q || !open) return [];
		return programs
			.filter((p) => p.name.toLowerCase().includes(q))
			.sort((a, b) => +!a.name.toLowerCase().startsWith(q) - +!b.name.toLowerCase().startsWith(q))
			.slice(0, 8);
	});

	let fName = $state('');
	let fYear = $state('');
	let fStartMonth = $state('');
	let fEndYear = $state('');
	let fEndMonth = $state('');
	let fFormat = $state('');
	let fType = $state('');
	let fOrg = $state('');

	let filtering = $derived(
		!!(fName.trim() || fYear || fStartMonth || fEndYear || fEndMonth || fFormat || fType || fOrg.trim())
	);

	function clearFilter() {
		fName = fYear = fStartMonth = fEndYear = fEndMonth = fFormat = fType = fOrg = '';
	}

	function fits(p: Program) {
		const q = fName.trim().toLowerCase();
		const o = fOrg.trim().toLowerCase();
		const [sy, sm] = p.start_date!.split('-');
		const ongoing = isOngoing(p);
		const [ey, em] = ongoing ? ['', ONGOING] : p.end_date!.split('-');
		return (
			(!q || p.name.toLowerCase().includes(q)) &&
			(!fYear || sy === fYear) &&
			(!fStartMonth || sm === fStartMonth) &&
			(!fEndYear || ey === fEndYear) &&
			(!fEndMonth || em === fEndMonth) && 
			(!fFormat || formatOf(p) === fFormat) &&
			(!fType || p.type === fType) &&
			(!o || p.organizers.some((n) => n.toLowerCase().includes(o)))
		);
	}

	let byYear = $derived.by(() => {
		if (!filtering) return [];
		const groups = new Map<string, Program[]>();
		for (const p of [...answerPool].sort((x, y) => x.start_date!.localeCompare(y.start_date!))) {
			if (!fits(p)) continue;
			const y = p.start_date!.slice(0, 4);
			groups.set(y, [...(groups.get(y) ?? []), p]);
		}
		return [...groups].reverse();
	});
	let matchCount = $derived(byYear.reduce((n, [, ps]) => n + ps.length, 0));

	const POOL_YEARS = [...new Set(answerPool.map((p) => p.start_date!.slice(0, 4)))].sort().reverse();

	const known = (name: string) => organizers.some((o) => o.toLowerCase() === name.toLowerCase());

	let orgParts = $derived(splitOrgs(organizer));
	let orgValid = $derived(orgParts.length > 0 && orgParts.every(known));

	let orgSuggestions = $derived.by(() => {
		if (!orgOpen) return [];
		const q = (organizer.split(',').at(-1) ?? '').trim().toLowerCase();
		const taken = orgParts.map((o) => o.toLowerCase());
		const rest = organizers.filter((o) => !taken.includes(o.toLowerCase()) || o.toLowerCase() === q);
		if (!q || known(q)) return rest;
		return rest
			.filter((o) => o.toLowerCase().includes(q))
			.sort((a, b) => +!a.toLowerCase().startsWith(q) - +!b.toLowerCase().startsWith(q));
	});

	function keepVisible(node: HTMLElement, active: boolean) {
		if (active) node.scrollIntoView({ block: 'nearest' });
		return {
			update(active: boolean) {
				if (active) node.scrollIntoView({ block: 'nearest' });
			}
		};
	}

	function pickOrganizer(i: number) {
		const o = orgSuggestions[i];
		if (!o) return;
		organizer = [...organizer.split(',').slice(0, -1).map((x) => x.trim()).filter(Boolean), o].join(', ');
		orgOpen = false;
	}

	const any = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

	function randomProgram() {
		choose(any(answerPool));
	}

	function randomizeAll() {
		const p = any(answerPool);
		slug = p.slug;
		query = p.name;
		filledFrom = p.slug;
		open = false;
		startYear = any(YEARS);
		startMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
		if (Math.random() < 0.1) {
			[endYear, endMonth] = ['', ONGOING];
		} else {
			endYear = any(YEARS.filter((y) => y >= startYear));
			const from = endYear === startYear ? Number(startMonth) : 1;
			endMonth = String(from + Math.floor(Math.random() * (13 - from))).padStart(2, '0');
		}
		format = any(Object.keys(FORMAT_LABEL) as Format[]);
		type = any(Object.keys(TYPE_LABEL) as Type[]);
		organizer = any(organizers);
		orgOpen = false;
	}

	function onOrgKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			orgOpen = false;
			return;
		}
		if (!orgOpen) {
			if (e.key === 'ArrowDown') {
				orgOpen = true;
				orgHighlighted = 0;
			}
			return;
		}
		if (!orgSuggestions.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			orgHighlighted = Math.min(orgHighlighted + 1, orgSuggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			orgHighlighted = Math.max(orgHighlighted - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			pickOrganizer(orgHighlighted);
		}
	}

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
			guesses = (saved.guesses ?? []).filter((g: Guess) => bySlug.has(g.slug));
			gaveUp = !!saved.gaveUp;
		} catch (e) {
			console.warn('[hackdle] Could not load saved guesses, starting fresh:', e);
		}
	});

	function save() {
		try {
			localStorage.setItem(storageKey, JSON.stringify({ guesses, gaveUp }));
		} catch (e) {
			console.warn('[hackdle] Could not save guesses, progress will reset on reload:', e);
		}
	}

	function pick(i: number) {
		const p = suggestions[i];
		if (p) choose(p);
	}

	function choose(p: Program) {
		const fresh = p.slug !== filledFrom;
		slug = p.slug;
		query = p.name;
		open = false;
		if (fresh) fill(p);
	}

	function fill(p: Program) {
		filledFrom = p.slug;
		[startYear, startMonth] = p.start_date ? p.start_date.split('-') : ['', ''];
		[endYear, endMonth] = isOngoing(p) ? ['', ONGOING] : p.end_date ? p.end_date.split('-') : ['', ''];
		format = formatOf(p);
		type = p.type ?? '';
		organizer = p.organizers.join(', ');
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
			{ slug, start, end, format: format as Format, type: type as Type, organizer: orgParts.join(', ') },
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
		<p class="tagline">The daily guessing game for Hack Club programs!</p>
	</header>

	{#if done}
		<section class="card result">
			<h2>{won ? 'You got it!' : 'Today’s program was'}</h2>
			{@render details(answer)}
			<p class="muted">
				{#if won}Solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}.{/if}
				Come back tomorrow for a new one.
			</p>
		</section>
	{:else}
		<div class="play" class:with-filter={guesses.length}>
			<form class="card guess" onsubmit={submit}>
				<h2>Guess today's Hack Club program!</h2>

				<div class="fields">
					<label class="field wide">
						<span>Program</span>
						<div class="search has-dice">
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
							<button
								class="dice"
								type="button"
								title="Random program"
								aria-label="Random program"
								onmousedown={(e) => e.preventDefault()}
								onclick={randomProgram}>🎲</button
							>

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

					<fieldset class="field">
						<legend>Start</legend>
						<div class="date">
							<select aria-label="Start month" class:valid={startMonth} bind:value={startMonth}>
								<option value="" disabled>Month</option>
								{#each MONTHS as m, i}<option value={String(i + 1).padStart(2, '0')}>{m}</option>{/each}
							</select>
							<select aria-label="Start year" class:valid={startYear} bind:value={startYear}>
								<option value="" disabled>Year</option>
								{#each YEARS as y}<option value={y}>{y}</option>{/each}
							</select>
						</div>
					</fieldset>

					<fieldset class="field">
						<legend>End</legend>
						<div class="date">
							<select aria-label="End month" class:valid={endMonth} bind:value={endMonth}>
								<option value="" disabled>Month</option>
								<option value={ONGOING}>Ongoing</option>
								{#each MONTHS as m, i}<option value={String(i + 1).padStart(2, '0')}>{m}</option>{/each}
							</select>
							{#if endMonth !== ONGOING}
								<select aria-label="End year" class:valid={endYear} bind:value={endYear}>
									<option value="" disabled>Year</option>
									{#each YEARS as y}<option value={y}>{y}</option>{/each}
								</select>
							{/if}
						</div>
					</fieldset>

					<fieldset class="field wide">
						<legend>Format</legend>
						<div class="choices">
							{#each Object.entries(FORMAT_LABEL) as [value, label]}
								<button type="button" class:on={format === value} onclick={() => (format = value as Format)}
									>{label}</button
								>
							{/each}
						</div>
					</fieldset>

					<fieldset class="field wide">
						<legend>Type</legend>
						<div class="choices">
							{#each Object.entries(TYPE_LABEL) as [value, label]}
								<button type="button" class:on={type === value} onclick={() => (type = value as Type)}>{label}</button>
							{/each}
						</div>
					</fieldset>

					<label class="field wide">
						<span>Organizer</span>
						<div class="search">
							<input
								type="text"
								placeholder="Who ran it? Any organizer counts"
								autocomplete="off"
								spellcheck="false"
								role="combobox"
								aria-expanded={orgOpen}
								aria-controls="organizer-list"
								bind:value={organizer}
								onfocus={() => ((orgOpen = true), (orgHighlighted = 0))}
								oninput={() => ((orgOpen = true), (orgHighlighted = 0))}
								onkeydown={onOrgKeydown}
								onblur={() => setTimeout(() => (orgOpen = false), 150)}
								class:valid={orgValid}
							/>

							{#if orgSuggestions.length}
								<ul class="suggestions scroll" id="organizer-list" role="listbox">
									{#each orgSuggestions as o, i (o)}
										<li role="option" aria-selected={i === orgHighlighted} use:keepVisible={i === orgHighlighted}>
											<button
												type="button"
												class:active={i === orgHighlighted}
												onmouseenter={() => (orgHighlighted = i)}
												onmousedown={(e) => e.preventDefault()}
												onclick={() => pickOrganizer(i)}
											>
												<span class="ph">{o[0].toUpperCase()}</span>
												{o}
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</label>
				</div>

				<div class="actions">
					<button class="submit" type="submit" disabled={!complete}>Guess</button>
					<button class="randomize" type="button" onclick={randomizeAll}>🎲 Randomize</button>
					{#if guesses.length >= 3}
						<button class="link" type="button" onclick={giveUp}>Give up</button>
					{/if}
				</div>
			</form>

			{#if guesses.length}
				<aside class="card filter" aria-label="Filter">
					<div class="filter-head">
						<h3>Filter</h3>
						{#if filtering}
							<span class="count">{matchCount} {matchCount === 1 ? 'program' : 'programs'}</span>
							<button class="link clear" type="button" onclick={clearFilter}>Clear</button>
						{/if}
					</div>

					<div class="filter-fields">
						<input class="span" type="search" placeholder="Name" aria-label="Name" bind:value={fName} />
						<span class="filter-label">Start</span>
						<select aria-label="Start month" bind:value={fStartMonth}>
							<option value="">Month</option>
							{#each MONTHS as m, i}<option value={String(i + 1).padStart(2, '0')}>{m}</option>{/each}
						</select>
						<select aria-label="Start year" bind:value={fYear}>
							<option value="">Year</option>
							{#each POOL_YEARS as y}<option value={y}>{y}</option>{/each}
						</select>
						<span class="filter-label">End</span>
						<select aria-label="End month" bind:value={fEndMonth}>
							<option value="">Month</option>
							{#each MONTHS as m, i}<option value={String(i + 1).padStart(2, '0')}>{m}</option>{/each}
							<option value={ONGOING}>Ongoing</option>
						</select>
						
						<select aria-label="End year" bind:value={fEndYear} disabled={fEndMonth === ONGOING}>
							<option value="">Year</option>
							{#each POOL_YEARS as y}<option value={y}>{y}</option>{/each}
						</select>
						<div class="span pair">
							<select aria-label="Format" bind:value={fFormat}>
								<option value="">Any format</option>
								{#each Object.entries(FORMAT_LABEL) as [value, label]}<option {value}>{label}</option>{/each}
							</select>
							<select aria-label="Type" bind:value={fType}>
								<option value="">Any type</option>
								{#each Object.entries(TYPE_LABEL) as [value, label]}<option {value}>{label}</option>{/each}
							</select>
						</div> 
						<input class="span" type="search" placeholder="Organizer" aria-label="Organizer" bind:value={fOrg} />
					</div>

					<div class="matches scroll">
						{#each byYear as [year, ps] (year)}
							<h4 class="year">{year}</h4>
							<ul>
								{#each ps as p (p.slug)}
									<li>
										<button type="button" class:on={slug === p.slug} onclick={() => choose(p)}>
											{#if logoFor(p)}<img src={logoFor(p)} alt="" loading="lazy" />{:else}<span class="ph">{p.name[0]}</span>{/if}
											{p.name}
										</button>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="muted none">{filtering ? 'No programs match.' : 'Fill in any field to find programs.'}</p>
						{/each}
					</div>
				</aside>
			{/if}
		</div>
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
							{#if i === 5}<Organizers names={splitOrgs(cell.label)} pick />{:else}<span class:name={i === 0}>{cell.label}</span>{/if}
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
		<button class="yesterday" type="button" onclick={() => dialog?.showModal()}>
			Yesterday's program was <strong>{yesterday.name}</strong>
		</button>

		<dialog
			class="modal"
			bind:this={dialog}
			onclick={(e) => e.target === dialog && dialog.close()}
			aria-labelledby="yesterday-title"
		>
			<div class="card">
				<button class="close" type="button" aria-label="Close" onclick={() => dialog?.close()}>×</button>
				<h2 id="yesterday-title">Yesterday's program</h2>
				{@render details(yesterday)}
			</div>
		</dialog>
	{/if}
</main>

{#snippet details(p: Program)}

	<div class="winner">
		{#if logoFor(p)}<img src={logoFor(p)} alt="" />{/if}
		<div>
			<strong>{p.name}</strong>
			{#if p.description}<p>{p.description}</p>{/if}
			{#if p.url}<a href={p.url} target="_blank" rel="noreferrer">Visit site →</a>{/if}
		</div>
	</div>

	<dl class="facts">
		<div><dt>Start</dt><dd>{#if p.start_date}{p.start_date}{:else}<Undefined which="start" />{/if}</dd></div>
		<div><dt>End</dt><dd>{#if p.end_date}{p.end_date}{:else if isOngoing(p)}Ongoing{:else}<Undefined which="end" />{/if}</dd></div>
		<div><dt>Format</dt><dd>{FORMAT_LABEL[formatOf(p)]}</dd></div>
		<div><dt>Type</dt><dd>{p.type ? TYPE_LABEL[p.type] : '?'}</dd></div>
		<div>
			<dt>{p.organizers.length > 1 ? 'Organizers' : 'Organizer'}</dt>
			<dd><Organizers names={p.organizers} /></dd>
		</div>
	</dl>

{/snippet}
