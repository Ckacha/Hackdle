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
	logo_file: string | null;
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

export function logoFor(p: Program): string | null {
	return p.logo_file ? `/${p.logo_file}` : p.logo;
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

export const answerPool = programs.filter((p) => p.end_date && p.type && logoFor(p));

function compareOverlap<T extends string>(guess: T, answer: T, labels: Record<T, string>): Cell {
	const verdict: Verdict = guess === answer ? 'correct' : guess === 'both' || answer === 'both' ? 'partial' : 'wrong';
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
