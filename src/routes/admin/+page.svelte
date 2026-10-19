<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import type { PageProps } from './$types';
	import './edit.css';

	let { data, form }: PageProps = $props();

	let query = $state('');
	let selected = $state<string | null>(null);
	let preview = $state<string | null>(null);
	let busy = $state(false);

	let view = $state<'list' | 'deprecated' | 'days'>('list');
	let programs = $derived(data.authed ? (view === 'deprecated' ? data.deprecated : data.programs) : []);
	let found = $derived(selected && selected !== 'new' ? programs.find((p) => p.slug === selected) : undefined);
	let current = $derived(view === 'list' ? found : undefined);
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
		choose(null);
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
		return async ({ result, update }) => {
			await update({ reset: false });
			busy = false;
			if (result.type === 'success') {
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
		<p class="tagline">Changes save straight to docs/list.json</p>
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
						<input type="search" placeholder="Search {programs.length} programs…" bind:value={query} />
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
										{p.name}
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
						>
							<h2>{creating ? 'New program' : current?.name}</h2>
							{#if current}<p class="muted">slug: {current.slug}</p>{/if}
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
								<button class="submit" type="submit" disabled={busy}>{creating ? 'Add program' : 'Save'}</button>
								{#if current}
									<button class="danger" type="submit" formaction="?/deprecate" disabled={busy}>Move to deprecated</button>
								{/if}
							</div>
						</form>
					{/key}
				{:else}
					<p class="muted empty">Pick a program on the left, or press + New.</p>
				{/if}
			</section>
		</div>
	{/if}
</main>
