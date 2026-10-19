<script lang="ts">
	let { names, max = 2 }: { names: string[]; max?: number } = $props();

	let rest = $derived(names.length - max);
</script>

{#if rest > 0}

	<span class="orgs" tabindex="0" role="button" aria-label="All organizers: {names.join(', ')}">
		{names.slice(0, max).join(', ')}
		<span class="orgs-more">+{rest} more</span>
		<span class="orgs-all" role="tooltip">{names.join(', ')}</span>
	</span>

{:else} 
	{names.join(', ') || 'Unknown'}
{/if}
