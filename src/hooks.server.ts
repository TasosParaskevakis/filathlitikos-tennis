import type { Handle } from '@sveltejs/kit';
import { getPlatformProxy } from 'wrangler';

let cachedPlatform: Awaited<ReturnType<typeof getPlatformProxy>> | null = null;

async function devPlatform() {
	if (!cachedPlatform) cachedPlatform = await getPlatformProxy();
	return cachedPlatform;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.platform && import.meta.env.DEV) {
		const p = await devPlatform();
		event.platform = { env: p.env, context: p.ctx, caches: p.caches, cf: p.cf } as unknown as App.Platform;
	}
	return resolve(event);
};
