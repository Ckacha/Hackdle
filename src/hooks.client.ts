import type { HandleClientError } from '@sveltejs/kit/hooks';

export const handleError: HandleClientError = ({ kind, error, event }) => {
	if (kind === 'unknown') console.error(`[hackdle] Error on ${event.url.pathname}:`, error);
};
