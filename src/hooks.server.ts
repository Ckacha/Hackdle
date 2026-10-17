import { building } from '$app/env';
import type { ServerInit } from '@sveltejs/kit/hooks';
import { startDailyTimer } from '#lib/server/daily.ts';

export const init: ServerInit = () => {
	if (!building) startDailyTimer();
};
