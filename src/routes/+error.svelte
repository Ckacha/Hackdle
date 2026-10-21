<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · Hackdle</title>
</svelte:head>

<main>
	<header>
		<h1>{page.status}</h1>
		<p class="tagline">{page.status === 404 ? 'Page not found' : 'Something went wrong'}</p>
	</header>
	<section class="card">
		<p class="muted">
			{#if page.status === 404}
				This page doesn't exist.
			{:else}
				Something broke on our end. Try reloading, and if it keeps happening, ping @iamalive in
				<a href="https://hackclub.enterprise.slack.com/archives/C0CB25LV0PJ" target="_blank" rel="noreferrer">#hackdle</a>.
			{/if}
		</p>
		<p><a href="/">Back to the game</a></p>
	</section>
</main>
