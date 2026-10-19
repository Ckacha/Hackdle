import list from '../../docs/list.json';

export type Kind = 'ysws' | 'hackathon' | 'both';
export type Type = 'software' | 'hardware' | 'cad' | 'everything';
export type Format = 'online' | 'in-person' | 'both';

export interface Program {
	name: string;
	slug: string;
	kind: Kind;
	type: Type | null;
	start_date: string | null;
	end_date: string | null;
	status: 'ended' | 'ongoing' | 'upcoming' | 'cancelled';
	location: string | null;
	logo: string | null;
	logo_file: string | null;
	url: string | null;
	description: string | null;
	organizers: string[];
}

export interface Guess {
	slug: string;
	start: string;
	end: string;
	format: Format;
	type: Type;
	organizer: string;
}

export type Verdict = 'correct' | 'wrong';

export interface Cell {
	label: string;
	verdict: Verdict;
	arrow?: 'up' | 'down';
}

export const programs = list as Program[];

export const bySlug = new Map(programs.map((p) => [p.slug, p]));

export function logoFor(p: Program): string | null {
	return p.logo_file ? `/${p.logo_file}` : p.logo;
}

export const FORMAT_LABEL: Record<Format, string> = {
	online: 'Online',
	'in-person': 'In person',
	both: 'Both'
};

export const TYPE_LABEL: Record<Type, string> = {
	software: 'Software',
	hardware: 'Hardware',
	cad: 'CAD',
	everything: 'Everything'
};

const KIND_FORMAT: Record<Kind, Format> = {
	ysws: 'online',
	hackathon: 'in-person',
	both: 'both'
};

export const formatOf = (p: Program): Format => KIND_FORMAT[p.kind];

export const ONGOING = 'ongoing';

export const isOngoing = (p: Program) => p.status === 'ongoing' && !p.end_date;

export const COLUMNS = ['Program', 'Start', 'End', 'Format', 'Type', 'Organizer'] as const;

export const organizers = [
	...new Set(programs.flatMap((p) => p.organizers))
].sort((a, b) => a.localeCompare(b));

const playable = programs.filter(
	(p) => p.kind !== 'hackathon' && p.status !== 'cancelled' && p.start_date && (p.end_date || isOngoing(p)) && p.type
);
const withOrganizer = playable.filter((p) => p.organizers.length);

export const answerPool = withOrganizer.length ? withOrganizer : playable;

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(ym: string): string {
	const [y, m] = ym.split('-');
	return `${MONTHS[Number(m) - 1]} ${y}`;
}

function compareMonth(guess: string, answer: string): Cell {
	const a = answer === ONGOING ? ONGOING : answer.slice(0, 7);
	const label = guess === ONGOING ? 'Ongoing' : monthLabel(guess);
	if (guess === a) return { label, verdict: 'correct' };
	const later = a === ONGOING || (guess !== ONGOING && guess < a);
	return { label, verdict: 'wrong', arrow: later ? 'up' : 'down' };
}

const norm = (s: string) => s.trim().toLowerCase();

const isOrganizer = (guess: string, p: Program) =>
	p.organizers.some((o) => norm(o) === norm(guess));

export function compare(guess: Guess, answer: Program): Cell[] {
	return [
		{
			label: bySlug.get(guess.slug)?.name ?? guess.slug,
			verdict: guess.slug === answer.slug ? 'correct' : 'wrong'
		},
		compareMonth(guess.start, answer.start_date!),
		compareMonth(guess.end, isOngoing(answer) ? ONGOING : answer.end_date!),
		{
			label: FORMAT_LABEL[guess.format],
			verdict: guess.format === formatOf(answer) ? 'correct' : 'wrong'
		},
		{
			label: TYPE_LABEL[guess.type],
			verdict: guess.type === answer.type ? 'correct' : 'wrong'
		},
		{
			label: guess.organizer,
			verdict: isOrganizer(guess.organizer, answer) ? 'correct' : 'wrong'
		}
	];
}

export const isWin = (cells: Cell[]) => cells.every((c) => c.verdict === 'correct');
