<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { isOngoing, type Kind, type Program, type Type } from '#lib/game.ts';
	import ProgramCard from '#lib/ProgramCard.svelte';
	import type { PageProps } from './$types';
	import './edit.css';

	let { data, form }: PageProps = $props();

	let query = $state('');
	let selected = $state<string | null>(null);
	let preview = $state<string | null>(null);
	let busy = $state(false);

	let view = $state<'list' | 'review' | 'deprecated' | 'days'>('list');
	let programs = $derived(
		data.authed
			? view === 'deprecated'
				? data.deprecated
				: view === 'review'
					? data.programs.filter((p) => !p.checked)
					: data.programs
			: []
	);
	let checkedCount = $derived(data.authed ? data.programs.filter((p) => p.checked).length : 0);
	let found = $derived(selected && selected !== 'new' ? programs.find((p) => p.slug === selected) : undefined);
	let current = $derived(view === 'list' || view === 'review' ? found : undefined);
	let reviewing = $derived(view === 'review' && !!current);
	let retired = $derived(view === 'deprecated' ? found : undefined);
	let creating = $derived(view === 'list' && selected === 'new');

	let shown = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return programs;
		return programs.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.slug.includes(q) ||
				p.organizers.some((o) => o.toLowerCase().includes(q))
		);
	});

	const missing = (p: (typeof programs)[number]) =>
		[!p.start_date && 'start', !p.end_date && 'end', !p.type && 'type', !p.organizers.length && 'organizer', !p.logo_file && 'logo']
			.filter(Boolean)
			.join(', ');

	function choose(slug: string | null) {
		selected = slug;
		preview = null;
	}

	function show(v: typeof view) {
		view = v;
		choose(v === 'review' ? (programs[0]?.slug ?? null) : null);
	}

	function next(at: number) {
		choose(programs[at % Math.max(programs.length, 1)]?.slug ?? null);
	}

	function skip() {
		next(programs.findIndex((p) => p.slug === selected) + 1);
	}

	let draft = $state<Program | null>(null);
	let demo = $derived(draft && preview ? { ...draft, logo_file: null, logo: preview } : draft);

	let blockers = $derived.by(() => {
		if (!demo) return [];
		return [
			demo.kind === 'hackathon' && 'it is in person only',
			demo.status === 'cancelled' && 'it is cancelled',
			!demo.start_date && 'no start date',
			!demo.end_date && !isOngoing(demo) && 'no end date (and not ongoing)',
			!demo.type && 'no type',
			!demo.organizers.length && 'no organizers'
		].filter((b): b is string => !!b);
	});

	function live(form: HTMLFormElement) {
		const sync = () => {
			const f = new FormData(form);
			const s = (k: string) => String(f.get(k) ?? '').trim();
			draft = {
				name: s('name') || 'Untitled',
				slug: current?.slug ?? 'new',
				kind: (s('kind') || 'ysws') as Kind,
				type: (s('type') || null) as Type | null,
				start_date: s('start_date') || null,
				end_date: s('end_date') || null,
				status: (s('status') || 'ended') as Program['status'],
				location: s('location') || null,
				logo: current?.logo ?? null,
				logo_file: s('logo_file') || null,
				url: s('url') || null,
				description: s('description') || null,
				organizers: [
					...new Set(
						s('organizers')
							.split('\n')
							.map((o) => o.trim())
							.filter(Boolean)
					)
				]
			};
		};
		const read = () => queueMicrotask(sync);
		read();
		form.addEventListener('input', read);
		form.addEventListener('change', read);
		return {
			destroy: () => {
				form.removeEventListener('input', read);
				form.removeEventListener('change', read);
			}
		};
	}

	function onLogo(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		preview = file ? URL.createObjectURL(file) : null;
	}

	const submit: SubmitFunction = ({ action, cancel }) => {
		if (action.search.includes('deprecate') && !confirm(`Move ${current?.name} to deprecated.json?`)) {
			cancel();
			return;
		}
		busy = true;
		const at = programs.findIndex((p) => p.slug === selected);
		return async ({ result, update }) => {
			try {
				await update({ reset: false });
			} catch (e) {
				console.error('[hackdle] Admin action failed:', e);
			} finally {
				busy = false;
			}
			if (result.type === 'error') console.error('[hackdle] Admin action error:', result.error);
			if (result.type === 'success') {
				if (view === 'review' && (result.data?.passed || result.data?.deprecated)) {
					next(Math.max(at, 0));
					return;
				}
				if (result.data?.passed) return;
				if (result.data?.saved && view === 'review') return;
				if (result.data?.saved) {
					view = 'list';
					choose(String(result.data.saved));
				}
				if (result.data?.deprecated) choose(null);
			}
		};
	};
</script>

<svelte:head>
	<title>Admin · Hackdle</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="editor-main">
	<header>
		<h1>Admin</h1>
		<p class="tagline">Check list.json, should update</p>
	</header>

	{#if !data.authed}
		<form class="card login" method="POST" action="?/login" use:enhance>
			<h2>Password</h2>
			<input type="password" name="password" placeholder="Edit password" autocomplete="current-password" required />
			{#if form?.problem}<p class="problem">{form.problem}</p>{/if}
			<button class="submit" type="submit">Unlock</button>
		</form>
	{:else}
		<div class="editor">
			<aside class="card picker">
				<div class="views">
					<button type="button" class:on={view === 'list'} onclick={() => show('list')}>
						List ({data.programs.length})
					</button>
					<button type="button" class:on={view === 'review'} onclick={() => show('review')}>
						Check ({checkedCount}/{data.programs.length})
					</button>
					<button type="button" class:on={view === 'deprecated'} onclick={() => show('deprecated')}>
						Deprecated ({data.deprecated.length})
					</button>
					<button type="button" class:on={view === 'days'} onclick={() => show('days')}>Days</button>
				</div>
				{#if view === 'days'}
					<ul class="days">
						{#each data.days as d (d.date)}
							{@const p = data.programs.find((x) => x.slug === d.slug) ?? data.deprecated.find((x) => x.slug === d.slug)}
							<li>
								<button type="button" onclick={() => p && data.programs.includes(p) && ((view = 'list'), choose(p.slug))}>
									<span class="day-date">{d.date === data.today ? 'Today' : d.date}</span>
									<span class="day-name">{p?.name ?? d.slug}{#if p && !data.programs.includes(p)} (deprecated){/if}</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="picker-head">
						<input
							type="search"
							placeholder={view === 'review' ? `Search ${programs.length} left to check…` : `Search ${programs.length} programs…`}
							bind:value={query}
						/>
						{#if view === 'list'}
							<button class="new" type="button" class:on={creating} onclick={() => choose('new')}>+ New</button>
						{/if}
					</div>
					<ul>
						{#each shown as p (p.slug)}
							<li>
								<button type="button" class:on={selected === p.slug} onclick={() => choose(p.slug)}>
									{#if p.logo_file}<img src="/{p.logo_file}" alt="" loading="lazy" />{:else}<span class="ph"
											>{p.name[0].toUpperCase()}</span
										>{/if}
									<span class="picker-name">
										{p.name}{#if view === 'list' && p.checked}<span class="checked" title="Checked"> ✓</span>{/if}
										{#if missing(p)}<small>missing {missing(p)}</small>{/if}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<form method="POST" action="?/logout" use:enhance>
					<button class="link" type="submit">Log out</button>
				</form>
			</aside>

			<section class="card pane">
				{#if form?.message}<p class="notice">{form.message}</p>{/if}
				{#if form?.problem}<p class="problem">{form.problem}</p>{/if}

				{#if retired}
					<div class="retired">
						<h2>{retired.name}</h2>
						<p class="muted">slug: {retired.slug}</p>
						{#if retired.deprecated_reason}<p class="problem">{retired.deprecated_reason}</p>{/if}
						<dl>
							<dt>Site</dt>
							<dd>{#if retired.url}<a href={retired.url} target="_blank" rel="noreferrer">{retired.url}</a>{:else}None{/if}</dd>
							<dt>Dates</dt>
							<dd>{retired.start_date ?? '?'} to {retired.end_date ?? '?'}</dd>
							<dt>Organizers</dt>
							<dd>{retired.organizers?.join(', ') || 'None'}</dd>
							<dt>Description</dt>
							<dd>{retired.description ?? 'None'}</dd>
						</dl>
						<form method="POST" action="?/restore" use:enhance={submit}>
							<input type="hidden" name="slug" value={retired.slug} />
							<button class="submit" type="submit" disabled={busy}>Restore to list</button>
						</form>
					</div>
				{:else if current || creating}
					{#key selected}
						<form
							class="edit-form"
							method="POST"
							action={creating ? '?/create' : '?/save'}
							enctype="multipart/form-data"
							use:enhance={submit}
							use:live
						>
							<h2>{creating ? 'New program' : current?.name}</h2>
							{#if current}<p class="muted">slug: {current.slug}{#if current.checked} · checked ✓{/if}</p>{/if}
							{#if reviewing}
								<p class="muted">
									{checkedCount} of {data.programs.length} checked. Fix anything wrong, then press Pass to save and mark it checked.
								</p>
								{#if current?.url}
									<p><a href={current.url} target="_blank" rel="noreferrer">Open {current.url}</a></p>
								{/if}
							{/if}
							{#if current}<input type="hidden" name="slug" value={current.slug} />{/if}

							<div class="grid">
								<label class="wide">
									<span>Name</span>
									<input name="name" value={current?.name ?? ''} required />
								</label>

								{#if creating}
									<label class="wide">
										<span>Slug (blank = from name)</span>
										<input name="slug" placeholder="my-program" />
									</label>
								{/if}

								<label>
									<span>Format</span>
									<select name="kind" value={current?.kind ?? 'ysws'}>
										<option value="ysws">Online</option>
										<option value="hackathon">In person</option>
										<option value="both">Both</option>
									</select>
								</label>

								<label>
									<span>Type</span>
									<select name="type" value={current?.type ?? ''}>
										<option value="">Unknown</option>
										<option value="software">Software</option>
										<option value="hardware">Hardware</option>
										<option value="cad">CAD</option>
										<option value="everything">Everything</option>
									</select>
								</label>

								<label>
									<span>Start date</span>
									<input type="date" name="start_date" value={current?.start_date ?? ''} />
								</label>

								<label>
									<span>End date</span>
									<input type="date" name="end_date" value={current?.end_date ?? ''} />
								</label>

								<label>
									<span>Status</span>
									<select name="status" value={current?.status ?? 'ended'}>
										<option value="ended">Ended</option>
										<option value="ongoing">Ongoing</option>
										<option value="upcoming">Upcoming</option>
										<option value="cancelled">Cancelled</option>
									</select>
								</label>

								<label class="wide">
									<span>Organizers (one per line)</span>
									<textarea name="organizers" rows="3">{current?.organizers.join('\n') ?? ''}</textarea>
								</label>

								<label class="wide">
									<span>URL</span>
									<input type="url" name="url" value={current?.url ?? ''} placeholder="https://" />
								</label>

								<label class="wide">
									<span>Description</span>
									<textarea name="description" rows="3">{current?.description ?? ''}</textarea>
								</label>

								<label class="wide">
									<span>Location</span>
									<input name="location" value={current?.location ?? ''} />
								</label>

								<div class="wide logo-row">
									{#if preview || current?.logo_file}
										<img src={preview ?? `/${current?.logo_file}`} alt="" />
									{:else}
										<span class="ph big">?</span>
									{/if}
									<label>
										<span>Logo file (in static/)</span>
										<input name="logo_file" value={current?.logo_file ?? ''} placeholder="logos/slug.png" />
									</label>
									<label>
										<span>Upload new logo</span>
										<input type="file" name="logo_upload" accept="image/*" onchange={onLogo} />
									</label>
								</div>
							</div>

							<div class="edit-actions">
								{#if reviewing}
									<button class="submit" type="submit" formaction="?/pass" disabled={busy}>Pass ✓</button>
									<button class="link" type="button" onclick={skip} disabled={busy}>Skip</button>
								{/if}
								<button class={reviewing ? 'link' : 'submit'} type="submit" disabled={busy}>{creating ? 'Add program' : 'Save'}</button>
								{#if current}
									<button class="danger" type="submit" formaction="?/deprecate" disabled={busy}>Move to deprecated</button>
								{/if}
							</div>
						</form>
					{/key}
				{:else if view === 'review'}
					<p class="muted empty">
						{programs.length ? 'Pick a program on the left.' : `All ${data.programs.length} programs are checked.`}
					</p>
				{:else}
					<p class="muted empty">Pick a program on the left, or press + New.</p>
				{/if}
			</section>

			{#if (current || creating) && demo}
				<aside class="demo" aria-label="Preview">
					<div class="demo-head">
						<h3>User/public view</h3>
						{#if blockers.length}
							<span class="demo-note bad" title="Can't be a daily answer: {blockers.join(', ')}">Not visible</span>
						{:else}
							<span class="demo-note good" title="Can be a daily answer">Visible</span>
						{/if}
					</div>
					<ProgramCard p={demo} />
				</aside>
			{/if}
		</div>
	{/if}
</main>
