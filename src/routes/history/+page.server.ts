import { daily, pastDays, HISTORY_START } from '#lib/server/daily.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const { key, answer } = daily();
	return {
		today: key,
		answer,
		days: pastDays().filter((d) => d.date < key && d.date >= HISTORY_START)
	};
};
