import list from '../../docs/list.json';
import { formatOf, isOngoing, monthLabel, FORMAT_LABEL, ONGOING, TYPE_LABEL, type Format, type Program, type Type } from '#lib/program.ts';

export * from '#lib/program.ts';

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

export const COLUMNS = ['Program', 'Start', 'End', 'Format', 'Type', 'Organizer'] as const;

export const organizers = [
	...new Set(programs.flatMap((p) => p.organizers))
].sort((a, b) => a.localeCompare(b));

const playable = programs.filter(
	(p) => p.kind !== 'hackathon' && p.status !== 'cancelled' && p.start_date && (p.end_date || isOngoing(p)) && p.type
);
const withOrganizer = playable.filter((p) => p.organizers.length);

export const answerPool = withOrganizer.length ? withOrganizer : playable;

function compareMonth(guess: string, answer: string): Cell {
	const a = answer === ONGOING ? ONGOING : answer.slice(0, 7);
	const label = guess === ONGOING ? 'Ongoing' : monthLabel(guess);
	if (guess === a) return { label, verdict: 'correct' };
	const later = a === ONGOING || (guess !== ONGOING && guess < a);
	return { label, verdict: 'wrong', arrow: later ? 'up' : 'down' };
}

const norm = (s: string) => s.trim().toLowerCase();

export const splitOrgs = (s: string) =>
	s
		.split(',')
		.map((o) => o.trim())
		.filter(Boolean);

const isOrganizer = (guess: string, p: Program) =>
	splitOrgs(guess).some((g) => p.organizers.some((o) => norm(o) === norm(g)));

function guessedOrgs(guess: Guess) {
	const names = [...(bySlug.get(guess.slug)?.organizers ?? [])];
	for (const o of splitOrgs(guess.organizer)) if (!names.some((n) => norm(n) === norm(o))) names.push(o);
	return names.join(', ');
}

export function compare(guess: Guess, answer: Program): Cell[] {
	const orgs = guessedOrgs(guess);
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
			label: orgs,
			verdict: isOrganizer(orgs, answer) ? 'correct' : 'wrong'
		}
	];
}

export const isWin = (cells: Cell[]) => cells.every((c) => c.verdict === 'correct');
