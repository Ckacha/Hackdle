<script lang="ts">
	let { names, pick = false }: { names: string[]; pick?: boolean } = $props();

	const seed = Math.random();

	let text = $state<HTMLElement>();
	let overflow = $state(false);
	let tip = $state<{ x: number; y: number } | null>(null);

	let one = $derived(pick && names.length > 1);
	let shown = $derived(one ? names[Math.floor(seed * names.length)] : names.join(', '));
	let cut = $derived(one || overflow);

	$effect(() => {
		if (!text) return;
		const el = text;
		const check = () => (overflow = el.scrollWidth > el.clientWidth + 1);
		check();
		const ro = new ResizeObserver(check);
		ro.observe(el);
		return () => ro.disconnect();
	});

	function show(e: Event) {
		if (!cut) return;
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		tip = { x: Math.min(Math.max(r.left + r.width / 2, 150), innerWidth - 150), y: r.top };
	}

	const hide = () => (tip = null);

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { 
			destroy: () => node.remove() 
		};
	}
</script>

<svelte:window onscroll={hide} />

{#if names.length}
	<span
		class="orgs"
		class:cut
		tabindex={cut ? 0 : -1}
		role="button"
		aria-label={cut ? `All organizers: ${names.join(', ')}` : undefined}
		onmouseenter={show}
		onmouseleave={hide}
		onfocus={show}
		onblur={hide}
	>
		<span class="orgs-text" bind:this={text}>{shown}{#if one}…{/if}</span>
		{#if tip}
			<span class="orgs-all" role="tooltip" use:portal style="left: {tip.x}px; top: {tip.y}px">{names.join(', ')}</span>
		{/if}
	</span>
{:else}
	Unknown
{/if}
