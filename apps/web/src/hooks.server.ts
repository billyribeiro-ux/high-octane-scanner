import type { Handle } from '@sveltejs/kit';
import { ensureReady } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	await ensureReady();
	return resolve(event);
};
