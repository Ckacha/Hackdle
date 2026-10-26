import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { answerPool } from '#lib/game.ts';

const FILE = process.env.HACKDLE_DAILY_FILE || 'docs/daily.json';
const SCHEDULE = 'docs/schedule.json';
const TIME_ZONE = process.env.HACKDLE_TZ || 'America/New_York';

type History = Record<string, string>;

const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });

export const HISTORY_START = '2026-10-18';

export function todayKey(): string {
	return dateFormat.format(new Date());
}

function dayBefore(key: string): string {
	const d = new Date(`${key}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().slice(0, 10);
}

export function dayAfter(key: string): string {
	const d = new Date(`${key}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + 1);
	return d.toISOString().slice(0, 10);
}

const readJson = (file: string): History => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf-8')) : {});
const read = () => readJson(FILE);

export const readSchedule = () => readJson(SCHEDULE);

export function upcoming() {
	const today = todayKey();
	return Object.entries(readSchedule())
		.filter(([date]) => date > today)
		.map(([date, slug]) => ({ date, slug }))
		.sort((a, b) => a.date.localeCompare(b.date));
}

export function schedule(date: string, slug: string | null) {
	const today = todayKey();
	const next = Object.fromEntries(Object.entries(readSchedule()).filter(([d, s]) => d > today && d !== date && s !== slug));
	if (slug) next[date] = slug;
	const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
	writeFileSync(SCHEDULE, JSON.stringify(sorted, null, '\t') + '\n');
}

export function daily() {
	const history = read();
	const today = todayKey();

	if (!history[today] || !answerPool.some((p) => p.slug === history[today])) {
		const planned = readSchedule();
		const used = new Set([...Object.values(history), ...Object.entries(planned).filter(([d]) => d > today).map(([, s]) => s)]);
		const fresh = answerPool.filter((p) => !used.has(p.slug));
		const pool = fresh.length ? fresh : answerPool;
		history[today] = answerPool.some((p) => p.slug === planned[today])
			? planned[today]
			: pool[Math.floor(Math.random() * pool.length)].slug;
		writeFileSync(FILE, JSON.stringify(history, null, '\t') + '\n');
		console.log(`[hackdle] ${today}: picked ${history[today]}`);
	}

	return { key: today, answer: history[today], yesterday: history[dayBefore(today)] ?? null };
}

export function pastDays() {
	return Object.entries(read())
		.map(([date, slug]) => ({ date, slug }))
		.sort((a, b) => b.date.localeCompare(a.date));
}

let lastKey = '';

export function startDailyTimer() {
	const tick = () => {
		const key = todayKey();
		if (key !== lastKey) {
			lastKey = key;
			daily();
		}
	};
	tick();
	setInterval(tick, 30_000).unref();
}
