import { building } from '$app/env';
import type { HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { startDailyTimer } from '#lib/server/daily.ts';

export const init: ServerInit = () => {
	if (!building) startDailyTimer();
};

export const handleError: HandleServerError = ({ kind, error, event }) => {
	if (kind === 'unknown') console.error(`[hackdle] ${event.request.method} ${event.url.pathname}:`, error);
};
