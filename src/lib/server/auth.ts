import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Cookies, RequestEvent } from '@sveltejs/kit';

try {
	process.loadEnvFile();
} catch {}

export const COOKIE = 'hackdle_edit';

export const editPassword = () => process.env.HACKDLE_EDIT_PASSWORD || '';

const digest = (s: string) => createHash('sha256').update(`hackdle:${s}`).digest();

export const tokenFor = (password: string) => digest(password).toString('hex');

export function passwordMatches(guess: string) {
	const password = editPassword();
	return !!password && timingSafeEqual(digest(guess), digest(password));
}

export function isAuthed(cookies: Cookies) {
	const password = editPassword();
	const token = cookies.get(COOKIE);
	if (!password || !token) return false;
	const expected = Buffer.from(tokenFor(password));
	const given = Buffer.from(token);
	return given.length === expected.length && timingSafeEqual(given, expected);
}

export const MAX_TRIES = 3;

const LOCK_FILE = process.env.HACKDLE_LOCK_FILE || 'admin-locks.json';

type Failures = Record<string, number>;

function readFailures(): Failures {
	try {
		return existsSync(LOCK_FILE) ? JSON.parse(readFileSync(LOCK_FILE, 'utf-8')) : {};
	} catch (e) {
		console.error('[hackdle] Could not read admin lock file:', e);
		return {};
	}
}

const writeFailures = (f: Failures) => writeFileSync(LOCK_FILE, JSON.stringify(f, null, '\t') + '\n');

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function clientKey(event: Pick<RequestEvent, 'request' | 'getClientAddress'>) {
	const direct = event.getClientAddress();
	if (!LOOPBACK.has(direct)) return direct;
	const forwarded = event.request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
	return forwarded || null;
}

export const triesLeft = (key: string | null) => (key ? Math.max(MAX_TRIES - (readFailures()[key] ?? 0), 0) : MAX_TRIES);

export function recordFailure(key: string | null) {
	if (!key) return MAX_TRIES;
	const f = readFailures();
	f[key] = (f[key] ?? 0) + 1;
	writeFailures(f);
	console.warn(`[hackdle] Wrong admin password from ${key} (${f[key]}/${MAX_TRIES})`);
	return Math.max(MAX_TRIES - f[key], 0);
}

export function clearFailures(key: string | null) {
	const f = readFailures();
	if (!key || !(key in f)) return;
	delete f[key];
	writeFailures(f);
}
