import list from '../../docs/list.json';

export type Kind = 'ysws' | 'hackathon' | 'both';
export type Type = 'software' | 'hardware' | 'both';

export interface Program {
	name: string;
	slug: string;
	kind: Kind;
	type: Type | null;
	start_date: string | null;
	end_date: string | null;
	status: 'ended' | 'ongoing' | 'upcoming';
	location: string | null;
	logo: string | null;
	url: string | null;
	description: string | null;
}

export type Verdict = 'correct' | 'partial' | 'wrong';

export interface Cell {
	label: string;
	verdict: Verdict;
	arrow?: 'up' | 'down';
}

export const programs = list as Program[];

// Local copies in docs/logos win over remote URLs, which can rot.
const localLogos = import.meta.glob('../../docs/logos/*.{png,svg,webp,jpg,gif,ico,avif}', {
	eager: true,
	query: '?url',
	import: 'default'
}) as Record<string, string>;

const logoBySlug = new Map(
	Object.entries(localLogos).map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url])
);

export function logoFor(p: Program): string | null {
	return logoBySlug.get(p.slug) ?? p.logo;
}

export const KIND_LABEL: Record<Kind, string> = {
	ysws: 'YSWS',
	hackathon: 'Hackathon',
	both: 'YSWS + Event'
};

export const TYPE_LABEL: Record<Type, string> = {
	software: 'Software',
	hardware: 'Hardware',
	both: 'Both'
};

export const STATUS_LABEL: Record<Program['status'], string> = {
	ended: 'Ended',
	ongoing: 'Ongoing',
	upcoming: 'Upcoming'
};

export const COLUMNS = ['Program', 'Kind', 'Type', 'Status', 'Year'] as const;

// Only programs with a year, a type and a logo make fair daily answers.
const answerPool = programs
	.filter((p) => p.end_date && p.type && logoFor(p))
	.sort((a, b) => a.slug.localeCompare(b.slug));

export function todayKey(d = new Date()): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hash(s: string): number {
	let h = 2166136261;
	for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return h >>> 0;
}

export function answerFor(key: string): Program {
	return answerPool[hash(`hackdle:${key}`) % answerPool.length];
}

// "both" overlaps either side, so it's a partial match rather than a miss.
function compareOverlap<T extends string>(guess: T, answer: T, labels: Record<T, string>): Cell {
	const verdict: Verdict =
		guess === answer ? 'correct' : guess === 'both' || answer === 'both' ? 'partial' : 'wrong';
	return { label: labels[guess], verdict };
}

const year = (p: Program) => (p.end_date ? Number(p.end_date.slice(0, 4)) : null);

export function compare(guess: Program, answer: Program): Cell[] {
	const gy = year(guess);
	const ay = year(answer)!;
	return [
		{ label: guess.name, verdict: guess.slug === answer.slug ? 'correct' : 'wrong' },
		compareOverlap(guess.kind, answer.kind, KIND_LABEL),
		guess.type ? compareOverlap(guess.type, answer.type!, TYPE_LABEL) : { label: '?', verdict: 'wrong' },
		{
			label: STATUS_LABEL[guess.status],
			verdict: guess.status === answer.status ? 'correct' : 'wrong'
		},
		gy === null
			? { label: '?', verdict: 'wrong' }
			: {
					label: String(gy),
					verdict: gy === ay ? 'correct' : 'wrong',
					arrow: gy === ay ? undefined : gy < ay ? 'up' : 'down'
				}
	];
}
