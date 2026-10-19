import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { answerPool } from '#lib/game.ts';

const FILE = process.env.HACKDLE_DAILY_FILE || 'docs/daily.json';
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

function read(): History {
	return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf-8')) : {};
}

export function daily() {
	const history = read();
	const today = todayKey();

	if (!history[today] || !answerPool.some((p) => p.slug === history[today])) {
		const used = new Set(Object.values(history));
		const fresh = answerPool.filter((p) => !used.has(p.slug));
		const pool = fresh.length ? fresh : answerPool;
		history[today] = pool[Math.floor(Math.random() * pool.length)].slug;
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
