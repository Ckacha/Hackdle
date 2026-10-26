<script lang="ts">
	import './info.css';

	const SECTIONS = [
		{ id: 'about', label: 'What is Hackdle?' },
		{ id: 'fields', label: 'The fields' },
		{ id: 'sources', label: 'Sources' }
	];

	const EXAMPLE = [
		{ column: 'Program', label: 'Construct', verdict: 'wrong', logo: '/logos/construct.png' },
		{ column: 'Start', label: 'Dec 2025', verdict: 'wrong', arrow: '▼' },
		{ column: 'End', label: 'Apr 2026', verdict: 'wrong', arrow: '▼' },
		{ column: 'Format', label: 'Online', verdict: 'correct' },
		{ column: 'Type', label: 'CAD', verdict: 'wrong' },
		{ column: 'Organizer', label: 'Olive', verdict: 'wrong' }
	];

	let active = $state('about');
	let pinned = $state<string | null>(null);
	const unpin = () => (pinned = null);

	function jump(id: string) {
		pinned = id;
		active = id;
	}

	function track() {
		if (pinned) return;
		const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
		let current = SECTIONS[0].id;
		for (const { id } of SECTIONS) {
			const el = document.getElementById(id);
			if (el && el.getBoundingClientRect().top <= 120) current = id;
		}
		active = atEnd ? SECTIONS[SECTIONS.length - 1].id : current;
	}

	$effect(track);
</script>

<svelte:window onscroll={track} onresize={track} onwheel={unpin} ontouchstart={unpin} onkeydown={unpin} />

<svelte:head>
	<title>Info · Hackdle</title>
</svelte:head>

<main class="info-main">
	<header>
		<h1>Info</h1>
	</header>

	<div class="info-layout">
		<nav class="toc" aria-label="Sections">
			<ol>
				{#each SECTIONS as s (s.id)}
					<li>
						<a href="#{s.id}" onclick={() => jump(s.id)} class:on={active === s.id} aria-current={active === s.id ? 'true' : undefined}>{s.label}</a>
					</li>
				{/each}
			</ol>
		</nav>

		<article class="card info">
			<section aria-labelledby="about">
				<h2 id="about">Hi! <img class="emoji" src="/emoji/agahi.gif" alt=":agahi:" title=":agahi:" /></h2>
				<p>Hackdle is inspired by <a target="_blank" rel="noreferrer" href="https://us.genshindle.com/">Genshindle</a>, which was itself inspired by <a target="_blank" rel="noreferrer" href="https://www.nytimes.com/games/wordle">Wordle</a>! However, in this case, the features you have to guess are the different YSWS events at Hack Club.</p>
				<h3 id="guessing">How a guess works</h3>
				<p>You'll have to guess a random YSWS program that's happened at Hack Club. Search for one and pick it, and based on its fields (start date, end date, format, type and organizers) you'll get hints on how close you are. Each field turns green if it's correct and red if it's wrong, and for dates an arrow shows if the real date is later (▲) or earlier (▼). For example, if the answer were Blueprint and you guessed Construct, you'd see:</p>
				<div class="example" aria-label="Example guess">
					{#each EXAMPLE as cell (cell.column)}
						<div class="example-cell">
							<span class="example-head">{cell.column}</span>
							<div class="example-tile {cell.verdict}">
								{#if cell.logo}<img src={cell.logo} alt="" />{/if}
								<span>{cell.label}</span>
								{#if cell.arrow}<span class="example-arrow">{cell.arrow}</span>{/if}
							</div>
						</div>
					{/each}
				</div>
				<p>Only the format matches, and the arrows show that Blueprint started and ended earlier. You get 5 guesses in total, after which the answer is revealed.</p>
				<p>The daily program resets every day at midnight Eastern Time (EST/EDT).</p>
			</section>
			<section aria-labelledby="fields">
				<h2 id="fields">The fields</h2>
				<h3 id="dates">Start and end</h3>
				<p>Dates are compared by the month and year (not the exact day, because I can't be bothered 😭)! This goes for both online programs and in-person events. The start is the date the program opened for submissions or the event started, and the end is the last day for submissions or the last day of the event. Ongoing means either the program is still accepting submissions, or it's a permanent event (like Boba Drops!). If a date isn't known yet and you know it, please feel free to message @iamalive on Slack in the <a target="_blank" rel="noreferrer" href="https://hackclub.enterprise.slack.com/archives/C0CB25LV0PJ">#hackdle</a> channel!</p>
				<h3 id="format">Format</h3>
				<p>Online means it's a YSWS that you can complete from anywhere, while In person (IRL) means it's a hackathon or event at a venue (think Prototype or Campfire Flagship!). Online + In person means it's an online YSWS that eventually leads into an in-person event (like Macondo or Shiba!).</p>
				<h3 id="type">Type</h3>
				<p>Type is what you build for the program: Software (websites, apps, games and tools), Hardware (PCBs, electronics and physical builds), CAD (3D models and designs) or Everything, where anything goes.</p>
				<h3 id="organizer">Organizer</h3>
				<p>The people who ran the program! A program can have more than one organizer, and your guess counts as correct if any one of the organizers you guessed ran the answer. Names are matched without caring about capitalization, and organizers are listed by the name they go by in Hack Club. (If I deadnamed someone, PLEASE LET ME KNOW! Same if something here is wrong.)</p>
			</section>
			<section aria-labelledby="sources">
				<h2 id="sources">Sources</h2>
				<p>The full list should be visible from the <a href="/list">Catalog</a> tab on the top right, and every entry was (painstakingly) checked by myself. Names, deadlines, descriptions and many logos came from <a target="_blank" rel="noreferrer" href="https://ysws.hackclub.com/">ysws.hackclub.com</a> and its <a target="_blank" rel="noreferrer" href="https://github.com/hackclub/YSWS-Catalog">YSWS Catalog</a> on GitHub. Each program's website was used to fill in dates, descriptions, logos and the organizer or team section. Many organizers came from Hack Club's <a target="_blank" rel="noreferrer" href="https://github.com/hackclub/dns">DNS records</a>, where each subdomain notes who set it up, and the Hack Club Slack gave each program's channel and the organizers that the site didn't list.</p>
				<p>Programs whose sites are gone (they no longer load, return an error, or never existed) were moved out of the main list. You can find them in <a target="_blank" rel="noreferrer" href="https://github.com/Ckacha/Hackdle/blob/main/docs/deprecated.json"><code>deprecated.json</code></a> on GitHub.</p>
				<h3 id="mistakes">Found a mistake?</h3>
				<p>Some info might be wrong or missing. If you know better, post in <a target="_blank" rel="noreferrer" href="https://hackclub.enterprise.slack.com/archives/C0CB25LV0PJ">#hackdle</a> on Slack or DM @Iamalive.</p>
			</section>
		</article>
	</div>
</main>
