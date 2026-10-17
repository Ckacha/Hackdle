import { daily } from '#lib/server/daily.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => daily();
