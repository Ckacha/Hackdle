import { defineParams } from '@sveltejs/kit/params';

const VIEWS = ['verify', 'deprecated', 'days'] as const;

export const params = defineParams({
	view: (p) => VIEWS.find((v) => v === p)
});
