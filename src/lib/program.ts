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

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(ym: string): string {
	const [y, m] = ym.split('-'); 
	return `${MONTHS[Number(m) - 1]} ${y}`;
}
