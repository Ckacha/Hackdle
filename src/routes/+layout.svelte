<script lang="ts">
	import '../app.css';
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.png';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let dark = $state(false);

	$effect(() => {
		const t = document.documentElement.dataset.theme;
		dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function toggleTheme() {
		dark = !dark;
		const t = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = t;
		try {
			localStorage.setItem('hackdle:theme', t);
		} catch (e) {
			console.warn('[hackdle] Could not save theme:', e);
		}
	}

	const TABS = [
		{ href: '/', label: 'Play' },
		{ href: '/list', label: 'Catalog' },
		{ href: '/history', label: 'History' },
		{ href: '/info', label: 'Info' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="topbar">
	<a class="flag" href="https://hackclub.com/" target="_blank" rel="noreferrer">
		<img src="https://assets.hackclub.com/flag-orpheus-top.svg" alt="Hack Club" />
	</a>
	<div class="tabs">
		{#each TABS as t (t.href)}
			<a href={t.href} class:active={page.url.pathname === t.href} aria-current={page.url.pathname === t.href ? 'page' : undefined}
				>{t.label}</a
			>
		{/each}
		<button class="theme" onclick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
			{#if dark}
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
					><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg
				>
			{:else}
				<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" /></svg>
			{/if}
		</button>
	</div>
</nav>

{@render children()}

<footer>Made with &lt;3 by a Hack Clubber</footer>
