<script lang="ts">
	import '../app.css';
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.png';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const TABS = [
		{ href: '/', label: 'Play' },
		{ href: '/list', label: 'Master List' },
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
	</div>
</nav>

{@render children()}

<footer>Made with &lt;3 by a Hack Clubber</footer>
