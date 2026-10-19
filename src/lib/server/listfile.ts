import { readFileSync, writeFileSync } from 'node:fs';
import type { Program } from '#lib/game.ts';

const LIST = 'docs/list.json';
const DEPRECATED = 'docs/deprecated.json';
const NAMES = 'docs/ysws.md';

export type Entry = Program & Record<string, unknown>;

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf-8'));
const writeJson = (file: string, data: unknown) => writeFileSync(file, JSON.stringify(data, null, '\t') + '\n');

export const readList = (): Entry[] => readJson(LIST);
export const writeList = (list: Entry[]) => writeJson(LIST, list);

export function moveToDeprecated(slug: string) {
	const list = readList();
	const entry = list.find((p) => p.slug === slug);
	if (!entry) return null;
	writeJson(DEPRECATED, [...readJson(DEPRECATED), entry]);
	writeList(list.filter((p) => p.slug !== slug));
	removeName(entry.name);
	return entry;
}

function readNames() {
	return readFileSync(NAMES, 'utf-8').split('\n');
}

function writeNames(lines: string[]) {
	writeFileSync(NAMES, lines.join('\n'));
}

export function renameName(from: string, to: string) {
	if (from === to) return;
	const lines = readNames();
	const i = lines.indexOf(`- ${from}`);
	if (i === -1) return;
	lines[i] = `- ${to}`;
	writeNames(lines);
}

export function removeName(name: string) {
	writeNames(readNames().filter((l) => l !== `- ${name}`));
}

export function addName(name: string) {
	const lines = readNames();
	if (lines.includes(`- ${name}`)) return;
	const items = lines.map((l, i) => [l, i] as const).filter(([l]) => l.startsWith('- '));
	const after = items.find(([l]) => l.slice(2).toLowerCase() > name.toLowerCase());
	const at = after ? after[1] : (items.at(-1)?.[1] ?? lines.length - 1) + 1;
	lines.splice(at, 0, `- ${name}`);
	writeNames(lines);
}
