import { error, fail } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'node:fs';
import { COOKIE, editPassword, isAuthed, passwordMatches, tokenFor } from '#lib/server/auth.ts';
import { addName, moveToDeprecated, readList, renameName, writeList, type Entry } from '#lib/server/listfile.ts';
import type { Actions, PageServerLoad } from './$types';

const KINDS = ['ysws', 'hackathon', 'both'];
const TYPES = ['software', 'hardware', 'both'];
const STATUSES = ['ended', 'ongoing', 'upcoming'];
const CONFIDENCE = ['high', 'medium', 'low'];
const IMAGE_EXT: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/svg+xml': 'svg',
	'image/avif': 'avif'
};
const MAX_LOGO = 2 * 1024 * 1024;

function guard(cookies: Parameters<typeof isAuthed>[0]) {
	if (!editPassword()) error(404, 'Not found');
	if (!isAuthed(cookies)) error(401, 'Log in first');
}

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const orNull = (s: string) => s || null;
const oneOf = (s: string, allowed: string[]) => (allowed.includes(s) ? s : null);

const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

function fields(f: FormData) {
	const name = text(f, 'name');
	const start = text(f, 'start_date');
	const end = text(f, 'end_date');
	const date = /^\d{4}-\d{2}-\d{2}$/;
	if (!name) return { problem: 'Name is required' };
	if ((start && !date.test(start)) || (end && !date.test(end))) return { problem: 'Dates must be YYYY-MM-DD' };
	if (start && end && end < start) return { problem: 'End date is before start date' };
	return {
		values: {
			name,
			kind: oneOf(text(f, 'kind'), KINDS) ?? 'ysws',
			type: oneOf(text(f, 'type'), TYPES),
			start_date: orNull(start),
			end_date: orNull(end),
			status: oneOf(text(f, 'status'), STATUSES) ?? 'ended',
			location: orNull(text(f, 'location')),
			url: orNull(text(f, 'url')),
			description: orNull(text(f, 'description')),
			organizers: [
				...new Set(
					text(f, 'organizers')
						.split('\n')
						.map((o) => o.trim())
						.filter(Boolean)
				)
			],
			organizer_confidence: oneOf(text(f, 'organizer_confidence'), CONFIDENCE),
			logo_file: orNull(text(f, 'logo_file'))
		} as Partial<Entry>
	};
}

async function saveLogo(f: FormData, slug: string) {
	const file = f.get('logo_upload');
	if (!(file instanceof File) || !file.size) return { file: null };
	const ext = IMAGE_EXT[file.type];
	if (!ext) return { problem: 'Logo must be a PNG, JPG, WebP, GIF, SVG or AVIF' };
	if (file.size > MAX_LOGO) return { problem: 'Logo must be under 2 MB' };
	mkdirSync('static/logos', { recursive: true });
	writeFileSync(`static/logos/${slug}.${ext}`, Buffer.from(await file.arrayBuffer()));
	return { file: `logos/${slug}.${ext}` };
}

export const load: PageServerLoad = ({ cookies }) => {
	if (!editPassword()) error(404, 'Not found');
	if (!isAuthed(cookies)) return { authed: false as const };
	return { authed: true as const, programs: readList().sort((a, b) => a.name.localeCompare(b.name)) };
};

export const actions: Actions = {
	login: async ({ request, cookies, url }) => {
		if (!editPassword()) error(404, 'Not found');
		const f = await request.formData();
		if (!passwordMatches(text(f, 'password'))) return fail(401, { problem: 'Wrong password' });
		cookies.set(COOKIE, tokenFor(editPassword()), {
			path: '/masterlistedit',
			httpOnly: true,
			sameSite: 'strict',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 30
		});
		return { loggedIn: true };
	},

	logout: ({ cookies }) => {
		cookies.delete(COOKIE, { path: '/masterlistedit' });
		return { loggedOut: true };
	},

	save: async ({ request, cookies }) => {
		guard(cookies);
		const f = await request.formData();
		const slug = text(f, 'slug');
		const list = readList();
		const entry = list.find((p) => p.slug === slug);
		if (!entry) return fail(404, { problem: `No program with slug "${slug}"` });
		const parsed = fields(f);
		if (parsed.problem) return fail(400, { problem: parsed.problem });
		const logo = await saveLogo(f, slug);
		if (logo.problem) return fail(400, { problem: logo.problem });
		const before = entry.name;
		Object.assign(entry, parsed.values, logo.file ? { logo_file: logo.file } : {});
		writeList(list);
		renameName(before, entry.name);
		return { saved: slug, message: `Saved ${entry.name}` };
	},

	create: async ({ request, cookies }) => {
		guard(cookies);
		const f = await request.formData();
		const parsed = fields(f);
		if (parsed.problem) return fail(400, { problem: parsed.problem });
		const list = readList();
		const base = slugify(text(f, 'slug') || parsed.values!.name!) || 'program';
		let slug = base;
		for (let n = 2; list.some((p) => p.slug === slug); n++) slug = `${base}-${n}`;
		const logo = await saveLogo(f, slug);
		if (logo.problem) return fail(400, { problem: logo.problem });
		const entry = {
			name: '',
			slug,
			kind: 'ysws',
			type: null,
			start_date: null,
			end_date: null,
			status: 'ended',
			location: null,
			event: null,
			logo: null,
			logo_kind: null,
			logo_file: null,
			url: null,
			url_status: null,
			archive_url: null,
			description: null,
			organizers: [],
			organizer_confidence: null,
			confidence: null,
			sources: [],
			...parsed.values,
			...(logo.file ? { logo_file: logo.file } : {})
		} as Entry;
		const at = list.findIndex((p) => p.name.toLowerCase() > entry.name.toLowerCase());
		list.splice(at === -1 ? list.length : at, 0, entry);
		writeList(list);
		if (entry.kind !== 'hackathon') addName(entry.name);
		return { saved: slug, message: `Added ${entry.name}` };
	},

	deprecate: async ({ request, cookies }) => {
		guard(cookies);
		const f = await request.formData();
		const entry = moveToDeprecated(text(f, 'slug'));
		if (!entry) return fail(404, { problem: 'Program not found' });
		return { deprecated: entry.slug, message: `Moved ${entry.name} to deprecated.json` };
	}
};
