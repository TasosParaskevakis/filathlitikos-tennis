import type { Handle } from '@sveltejs/kit';
import { getPlatformProxy } from 'wrangler';
import { COOKIE_NAME, verifyCookie } from '$lib/auth';

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

  const secret = event.platform?.env.AUTH_SECRET ?? 'dev-secret-change-me';
  const cookie = event.cookies.get(COOKIE_NAME);
  event.locals.isAdmin = await verifyCookie(secret, cookie);

  return resolve(event);
};
