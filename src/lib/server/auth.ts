import { createHash, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

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
